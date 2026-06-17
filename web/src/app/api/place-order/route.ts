import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  applyOffers,
  isOfferLive,
  toEngineOffer,
  type CartLineInput,
  type OfferRow,
} from "@/lib/catalog/offers";
import { FILE_TYPES } from "@/lib/catalog/fileTypes";
import { haversineKm, MAX_DELIVERY_KM } from "@/lib/geo/geocode";
import { glovoEstimate, isGlovoEnabled } from "@/lib/delivery/glovo";
import type { FileTypeKey } from "@/lib/catalog/schema";

export const dynamic = "force-dynamic";

// Flat platform charge on every order; shown at checkout only (not in the cart).
const SERVICE_FEE = 2;
// No platform commission on orders whose goods value is below this (lei).
const COMMISSION_FREE_BELOW = 2;
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Lazily initialized so the module can be imported at build time without env vars
let _stripe: Stripe | null = null;
function getStripe() {
  if (!_stripe) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-05-28.basil" as any });
  }
  return _stripe;
}

function serviceSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Pricing (mirrors web/src/lib/catalog/pricing.ts) ─────────────────────────

type Answers = Record<string, unknown>;
type PriceRule = { mode: "additive" | "per_unit"; amount: number; per?: string };
type CatalogField = {
  key: string;
  type: string;
  is_quantity?: boolean;
  price?: PriceRule;
  options?: Array<{ value: string; price?: PriceRule }>;
};
type CatalogItem = {
  id: string;
  base_price: number;
  min_quantity?: number;
  category_id?: string | null;
  requires_upload?: boolean;
  accepted_file_types?: FileTypeKey[];
  in_stock?: boolean;
  fields?: CatalogField[];
};
type OrderFileRef = { path: string; name: string };

/** Server-side mirror of fileTypes.fileAllowed — by extension, lenient when no types set. */
function fileTypeAllowed(name: string, accepted: FileTypeKey[] | undefined): boolean {
  const keys = accepted?.length ? accepted : (Object.keys(FILE_TYPES) as FileTypeKey[]);
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return keys.some((k) => FILE_TYPES[k]?.ext.includes(ext));
}

// IMPORTANT: must stay byte-for-byte equivalent to lib/catalog/pricing.ts (the FE preview).
// Any divergence > 1 bani rejects a legitimate order. Notably: per_unit with an unanswered
// `per` field resolves to 0 (NOT amount×1), and the quantity multiplier falls back to 1 when
// the answer is missing/0/NaN (`|| 1`, not `?? 1`).
function resolvePrice(rule: PriceRule | undefined, answers: Answers): number {
  if (!rule) return 0;
  if (rule.mode === "additive") return rule.amount;
  return rule.per ? rule.amount * (Number(answers[rule.per]) || 0) : 0;
}

function computeItemPrice(item: CatalogItem, answers: Answers) {
  // Defensive: an item document may predate `fields` (e.g. a simple product) — treat as no fields
  // rather than crashing the whole request with a 500.
  const fields = item.fields ?? [];
  const qField = fields.find((f) => f.type === "number" && f.is_quantity);
  // Clamp to the item's min_quantity floor (mirrors lib/catalog/pricing.ts).
  const quantity = Math.max(
    qField ? Number(answers[qField.key]) || 1 : 1,
    item.min_quantity ?? 1
  );
  let addons = 0;
  const breakdown: Record<string, number> = {};

  for (const field of fields) {
    if (field.type === "number" && field.is_quantity) continue;
    const val = answers[field.key];
    let c = 0;
    if (field.type === "single_select") {
      c = resolvePrice(field.options?.find((o) => o.value === val)?.price, answers);
    } else if (field.type === "multi_select") {
      for (const v of Array.isArray(val) ? (val as string[]) : []) {
        c += resolvePrice(field.options?.find((o) => o.value === v)?.price, answers);
      }
    } else if (field.type === "boolean") {
      c = val === true ? resolvePrice(field.price, answers) : 0;
    } else if (field.type === "number") {
      c = resolvePrice(field.price, answers);
    }
    if (c !== 0) breakdown[field.key] = c;
    addons += c;
  }

  const total = Math.round((quantity * (item.base_price + addons) + Number.EPSILON) * 100) / 100;
  return { total, breakdown, quantity };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Auth — get user from the bearer token the client sends
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return err("Unauthorized", 401);

    const anonSupabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await anonSupabase.auth.getUser();
    if (!user) return err("Unauthorized", 401);

    const body = await req.json() as {
      shop_id: string;
      lines: Array<{
        itemId: string;
        title: string;
        kind: "service" | "product";
        answers: Answers;
        clientTotal: number;
        files?: OrderFileRef[];
      }>;
      fulfilment: "delivery" | "pickup";
      delivery_address?: string;
      delivery_lat?: number; // optional precise drop-off coords (checkout map/geolocation)
      delivery_lng?: number;
      contact_phone?: string;
      notes?: string;
      payment_method: "cash_in_store" | "cash_on_delivery" | "online";
      code?: string; // optional promo code typed at checkout
    };

    const { shop_id, lines, fulfilment, delivery_address, delivery_lat, delivery_lng, contact_phone, notes, payment_method, code } = body;

    // Validate coordinates server-side; store null on anything out of range (never trust the client).
    const inRange = (v: unknown, max: number) =>
      typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= max;
    const deliveryLat = inRange(delivery_lat, 90) ? (delivery_lat as number) : null;
    const deliveryLng = inRange(delivery_lng, 180) ? (delivery_lng as number) : null;

    if (!shop_id || !lines?.length) return err("shop_id and lines are required", 400);
    if (fulfilment === "delivery" && !delivery_address) return err("delivery_address required", 400);
    // Delivery must be prepaid online; cash is only for in-store pickup.
    if (fulfilment === "delivery" && payment_method !== "online")
      return err("Comenzile cu livrare se plătesc online", 422);
    if (fulfilment === "pickup" && payment_method === "cash_on_delivery")
      return err("Plata la livrare nu este disponibilă pentru ridicare", 422);

    const db = serviceSupabase();

    // Load active catalog + shipping fee
    const { data: shop } = await db
      .from("shops")
      .select("active_version_id, delivery_fee, commission_rate, default_eta_minutes, lat, lng, address")
      .eq("id", shop_id)
      .single();
    if (!shop?.active_version_id) return err("Shop has no active catalog", 422);

    // Delivery radius: block when the drop-off is farther than MAX_DELIVERY_KM from the shop.
    // Enforced only when both points have coordinates (else allowed — the FE check mirrors this).
    if (
      fulfilment === "delivery" &&
      shop.lat != null &&
      shop.lng != null &&
      deliveryLat != null &&
      deliveryLng != null &&
      haversineKm(
        { lat: deliveryLat, lng: deliveryLng },
        { lat: shop.lat, lng: shop.lng },
      ) > MAX_DELIVERY_KM
    ) {
      return err(
        "Magazinul nu livrează în zona ta. Alege un magazin mai aproape de tine.",
        422,
      );
    }

    const { data: version } = await db
      .from("catalog_versions")
      .select("id, document")
      .eq("id", shop.active_version_id)
      .single();
    if (!version) return err("Catalog version not found", 422);

    const doc = version.document as { items: CatalogItem[] };

    // Reprice server-side
    let subtotal = 0;
    const orderItems = [];
    const cartLines: CartLineInput[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const catalogItem = doc.items.find((it) => it.id === line.itemId);
      if (!catalogItem) return err(`Item ${line.itemId} not in catalog`, 422);
      if (catalogItem.in_stock === false) return err(`"${line.title}" is out of stock`, 409);

      const { total, breakdown, quantity } = computeItemPrice(catalogItem, line.answers);

      if (Math.abs(total - line.clientTotal) > 0.01) {
        return err(`Price mismatch on "${line.title}": server=${total} client=${line.clientTotal}`, 422);
      }

      // Files: must belong to the caller's own storage folder (`{uid}/…`); required uploads
      // must have at least one. We trust the path (RLS gated its upload) but enforce ownership.
      const files = (line.files ?? []).filter((f) => f && typeof f.path === "string");
      if (files.some((f) => !f.path.startsWith(`${user.id}/`))) {
        return err(`Invalid file path on "${line.title}"`, 422);
      }
      if (catalogItem.requires_upload && files.length === 0) {
        return err(`"${line.title}" requires a file upload`, 422);
      }
      const badFile = files.find((f) => !fileTypeAllowed(f.name, catalogItem.accepted_file_types));
      if (badFile) {
        return err(`"${badFile.name}" has a file type not accepted for "${line.title}"`, 422);
      }

      orderItems.push({
        kind: line.kind,
        item_id: line.itemId,
        item_title: line.title,
        quantity,
        answers: line.answers as Database["public"]["Tables"]["order_items"]["Insert"]["answers"],
        price_breakdown: breakdown as Database["public"]["Tables"]["order_items"]["Insert"]["price_breakdown"],
        line_total: total,
        files: files as unknown as Database["public"]["Tables"]["order_items"]["Insert"]["files"],
      });
      cartLines.push({
        lineId: String(i),
        itemId: line.itemId,
        categoryId: catalogItem.category_id ?? null,
        quantity,
        lineTotal: total,
      });
      subtotal += total;
    }

    subtotal = round2(subtotal);

    // Apply offers: all live AUTOMATIC offers + an optional typed code (validated here).
    // Service role bypasses RLS, so we filter live/automatic ourselves.
    const { data: rawOffers } = await db.from("offers").select("*").eq("shop_id", shop_id);
    const live = ((rawOffers ?? []) as OfferRow[]).filter((o) => isOfferLive(o));
    const autos = live.filter((o) => o.trigger === "automatic");
    const codeOffer = code
      ? live.find((o) => o.trigger === "code" && o.code?.toLowerCase() === code.toLowerCase())
      : undefined;
    const engineOffers = [...autos, ...(codeOffer ? [codeOffer] : [])].map(toEngineOffer);

    // Shipping only applies to delivery — pickup has no delivery fee. Passing the correct
    // baseShipping also makes a free-shipping offer score correctly (it saves nothing on pickup).
    let baseShipping = fulfilment === "pickup" ? 0 : (shop.delivery_fee ?? 0);
    // When a courier provider (Glovo) is configured, its live quote is the authoritative delivery
    // fee (mirrors the checkout preview). Best-effort: falls back to the shop's flat fee on failure.
    // `courierDelivery` marks that the PLATFORM pays the courier — so the customer's delivery fee
    // must NOT also be credited to the shop's payout (it offsets the Glovo charge instead).
    let courierDelivery = false;
    if (
      fulfilment === "delivery" &&
      isGlovoEnabled() &&
      shop.lat != null &&
      shop.lng != null &&
      deliveryLat != null &&
      deliveryLng != null
    ) {
      const quote = await glovoEstimate(
        { lat: shop.lat, lng: shop.lng, address: shop.address ?? "" },
        { lat: deliveryLat, lng: deliveryLng, address: delivery_address ?? "" },
      );
      if (quote) {
        baseShipping = quote.fee;
        courierDelivery = true;
      }
    }
    const offers = applyOffers(cartLines, engineOffers, baseShipping);
    const discount = offers.discount;
    const shippingFee = offers.shippingFee;
    const serviceFee = SERVICE_FEE;

    // Platform commission: rate × goods, but nothing on tiny orders (goods < 2 lei). It's deducted
    // from the shop's payout — the customer never pays it. payout = what the shop receives.
    const goods = round2(subtotal - discount);
    const commission =
      goods >= COMMISSION_FREE_BELOW ? round2(goods * Number(shop.commission_rate ?? 0)) : 0;
    const total = round2(goods + shippingFee + serviceFee);
    // Shop keeps the delivery fee only when it delivers itself; for a platform-paid courier
    // (Glovo) the fee offsets the courier charge, so the shop is paid for goods only.
    const payout = round2(goods - commission + (courierDelivery ? 0 : shippingFee));

    // Insert order
    const { data: order, error: orderErr } = await db
      .from("orders")
      .insert({
        customer_id: user.id,
        shop_id,
        catalog_version_id: version.id,
        fulfilment,
        delivery_address: delivery_address ?? null,
        delivery_lat: deliveryLat,
        delivery_lng: deliveryLng,
        contact_phone: contact_phone ?? null,
        notes: notes ?? null,
        subtotal,
        discount,
        shipping_fee: shippingFee,
        service_fee: serviceFee,
        commission,
        payout,
        eta_minutes: shop.default_eta_minutes ?? null,
        applied_offers: offers.appliedOffers as unknown as Database["public"]["Tables"]["orders"]["Insert"]["applied_offers"],
        total,
        payment_method,
        payment_status: "pending",
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      console.error("Order insert:", orderErr);
      return err("Failed to create order", 500);
    }

    const { error: itemsErr } = await db
      .from("order_items")
      .insert(orderItems.map((oi) => ({ ...oi, order_id: order.id })));

    if (itemsErr) {
      console.error("Order items insert:", itemsErr);
      await db.from("orders").delete().eq("id", order.id);
      return err("Failed to save order items", 500);
    }

    // Stripe PaymentIntent (online only). If creation fails we roll the order back (cascade
    // deletes its items) instead of leaving an orphaned, unpayable `pending` order behind.
    let clientSecret: string | null = null;

    if (payment_method === "online") {
      try {
        const pi = await getStripe().paymentIntents.create(
          {
            amount: Math.round(total * 100), // RON → bani
            currency: "ron",
            metadata: { order_id: order.id, shop_id },
            automatic_payment_methods: { enabled: true },
          },
          // Idempotency: a client retry for the same order reuses the same PaymentIntent
          // rather than creating duplicates.
          { idempotencyKey: `pi_${order.id}` }
        );

        await db.from("orders").update({ payment_ref: pi.id }).eq("id", order.id);
        clientSecret = pi.client_secret;
      } catch (e) {
        console.error("Stripe PaymentIntent failed, rolling back order:", order.id, e);
        await db.from("orders").delete().eq("id", order.id);
        return err("Plata nu a putut fi inițializată. Încearcă din nou.", 502);
      }
    }

    return NextResponse.json({
      order_id: order.id,
      subtotal,
      discount,
      shipping_fee: shippingFee,
      service_fee: serviceFee,
      commission,
      payout,
      applied_offers: offers.appliedOffers,
      total,
      client_secret: clientSecret,
    });
  } catch (e) {
    console.error("place-order:", e);
    return err("Internal server error", 500);
  }
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
