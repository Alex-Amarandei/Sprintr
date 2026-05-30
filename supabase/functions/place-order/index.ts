import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { computeItemPrice } from "../_shared/pricing.ts";

const PLATFORM_FEE_PERCENT = 0.06; // 6 %

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // ── Auth: require a logged-in customer ────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    // ── Parse body ────────────────────────────────────────────────────────
    const body = await req.json() as {
      shop_id: string;
      lines: Array<{
        itemId: string;
        title: string;
        kind: "service" | "product";
        answers: Record<string, unknown>;
        clientTotal: number; // what the client computed — we recompute to verify
        fileName: string | null;
      }>;
      fulfilment: "delivery" | "pickup";
      delivery_address?: string;
      contact_phone?: string;
      notes?: string;
      payment_method: "cash_in_store" | "cash_on_delivery" | "online";
    };

    const {
      shop_id,
      lines,
      fulfilment,
      delivery_address,
      contact_phone,
      notes,
      payment_method,
    } = body;

    if (!shop_id || !lines?.length) {
      return json({ error: "shop_id and lines are required" }, 400);
    }
    if (fulfilment === "delivery" && !delivery_address) {
      return json({ error: "delivery_address required for delivery" }, 400);
    }

    // ── Load active catalog document for this shop ────────────────────────
    const { data: shop } = await serviceSupabase
      .from("shops")
      .select("active_version_id")
      .eq("id", shop_id)
      .single();

    if (!shop?.active_version_id) {
      return json({ error: "Shop has no active catalog" }, 422);
    }

    const { data: version } = await serviceSupabase
      .from("catalog_versions")
      .select("id, document")
      .eq("id", shop.active_version_id)
      .single();

    if (!version) return json({ error: "Catalog version not found" }, 422);

    const doc = version.document as {
      items: Array<{ id: string; base_price: number; fields: unknown[] }>;
    };

    // ── Reprice each line server-side ─────────────────────────────────────
    let subtotal = 0;
    const orderItems: Array<{
      kind: string;
      item_id: string;
      item_title: string;
      quantity: number;
      answers: Record<string, unknown>;
      price_breakdown: Record<string, number>;
      line_total: number;
    }> = [];

    for (const line of lines) {
      const catalogItem = doc.items.find((i) => i.id === line.itemId);
      if (!catalogItem) {
        return json({ error: `Item ${line.itemId} not found in catalog` }, 422);
      }

      // deno-lint-ignore no-explicit-any
      const { total, breakdown } = computeItemPrice(catalogItem as any, line.answers);

      // Reject if client total differs by more than 1 cent (rounding tolerance)
      if (Math.abs(total - line.clientTotal) > 0.01) {
        return json({
          error: `Price mismatch on "${line.title}": expected ${total}, got ${line.clientTotal}`,
        }, 422);
      }

      const quantityField = (catalogItem.fields as Array<{ is_quantity?: boolean; key: string }>)
        .find((f) => f.is_quantity);
      const quantity = quantityField ? Number(line.answers[quantityField.key] ?? 1) : 1;

      orderItems.push({
        kind: line.kind,
        item_id: line.itemId,
        item_title: line.title,
        quantity,
        answers: line.answers,
        price_breakdown: breakdown,
        line_total: total,
      });
      subtotal += total;
    }

    subtotal = Math.round(subtotal * 100) / 100;
    const platformFee = Math.round(subtotal * PLATFORM_FEE_PERCENT * 100) / 100;
    const total = Math.round((subtotal + platformFee) * 100) / 100;

    // ── Insert order (service role — tamper-proof) ────────────────────────
    const { data: order, error: orderErr } = await serviceSupabase
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
        total,
        payment_method,
        payment_status: "pending",
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      console.error("Order insert error:", orderErr);
      return json({ error: "Failed to create order" }, 500);
    }

    // Insert order items
    const { error: itemsErr } = await serviceSupabase
      .from("order_items")
      .insert(orderItems.map((oi) => ({ ...oi, order_id: order.id })));

    if (itemsErr) {
      console.error("Order items insert error:", itemsErr);
      // Roll back order on failure
      await serviceSupabase.from("orders").delete().eq("id", order.id);
      return json({ error: "Failed to save order items" }, 500);
    }

    // ── Stripe PaymentIntent (online only) ────────────────────────────────
    let clientSecret: string | null = null;

    if (payment_method === "online") {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) {
        return json({ error: "Stripe not configured" }, 500);
      }
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-05-28.basil" });

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100), // RON → bani
        currency: "ron",
        metadata: { order_id: order.id, shop_id },
        automatic_payment_methods: { enabled: true },
      });

      // Store payment ref immediately so webhook can match it
      await serviceSupabase
        .from("orders")
        .update({ payment_ref: paymentIntent.id })
        .eq("id", order.id);

      clientSecret = paymentIntent.client_secret;
    }

    return json({
      order_id: order.id,
      total,
      platform_fee: platformFee,
      client_secret: clientSecret, // null for cash orders
    });
  } catch (err) {
    console.error("place-order error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
