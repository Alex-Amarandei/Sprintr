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
  const quantity = qField ? Number(answers[qField.key]) || 1 : 1;
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
      contact_phone?: string;
      notes?: string;
      payment_method: "cash_in_store" | "cash_on_delivery" | "online";
      code?: string; // optional promo code typed at checkout
    };

    const { shop_id, lines, fulfilment, delivery_address, contact_phone, notes, payment_method, code } = body;

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
      .select("active_version_id, delivery_fee, commission_rate, default_eta_minutes")
      .eq("id", shop_id)
      .single();
    if (!shop?.active_version_id) return err("Shop has no active catalog", 422);

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

    const offers = applyOffers(cartLines, engineOffers, shop.delivery_fee ?? 0);
    const discount = offers.discount;
    const shippingFee = offers.shippingFee;
    const serviceFee = SERVICE_FEE;

    // Platform commission: rate × goods, but nothing on tiny orders (goods < 2 lei). It's deducted
    // from the shop's payout — the customer never pays it. payout = what the shop receives.
    const goods = round2(subtotal - discount);
    const commission =
      goods >= COMMISSION_FREE_BELOW ? round2(goods * Number(shop.commission_rate ?? 0)) : 0;
    const total = round2(goods + shippingFee + serviceFee);
    const payout = round2(goods - commission + shippingFee);

    // Insert order
    const { data: order, error: orderErr } = await db
      .from("orders")
      .insert({
        customer_id: user.id,
        shop_id,
        catalog_version_id: version.id,
        fulfilment,
        delivery_address: delivery_address ?? null,
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

    // Stripe PaymentIntent (online only)
    let clientSecret: string | null = null;

    if (payment_method === "online") {
      const pi = await getStripe().paymentIntents.create({
        amount: Math.round(total * 100), // RON → bani
        currency: "ron",
        metadata: { order_id: order.id, shop_id },
        automatic_payment_methods: { enabled: true },
      });

      await db.from("orders").update({ payment_ref: pi.id }).eq("id", order.id);
      clientSecret = pi.client_secret;
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
