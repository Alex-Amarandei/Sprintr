import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { finalizeModificationById } from "@/lib/orders/modifications-internal";

export const dynamic = "force-dynamic";

let _stripe: Stripe | null = null;
function getStripe() {
  if (!_stripe) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-05-28.basil" as any });
  }
  return _stripe;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Idempotency: record the event id first. A unique-violation means Stripe re-delivered an
  // event we already handled → ack and skip so we never double-apply.
  const { error: dupErr } = await db
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });
  if (dupErr) {
    if (dupErr.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    console.error("stripe_events insert failed (continuing):", dupErr);
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;

    // Delta charge for an order modification (the extra a customer pays to accept a change) →
    // finalize that modification instead of touching the order's own payment status.
    if (pi.metadata?.kind === "modification" && pi.metadata?.modification_id) {
      await finalizeModificationById(pi.metadata.modification_id);
      return NextResponse.json({ received: true });
    }

    const orderId = pi.metadata?.order_id;

    if (!orderId) {
      console.warn("payment_intent.succeeded: no order_id in metadata", pi.id);
      return NextResponse.json({ received: true }); // don't 4xx — Stripe retries
    }

    const { error } = await db
      .from("orders")
      .update({ payment_status: "paid", payment_ref: pi.id, paid_at: new Date().toISOString() })
      .eq("id", orderId);

    if (error) {
      console.error("Failed to mark order paid:", orderId, error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }
  } else if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const orderId = pi.metadata?.order_id;
    if (orderId) {
      await db.from("orders").update({ payment_status: "failed" }).eq("id", orderId);
    }
  } else if (event.type === "charge.refunded") {
    // Catches refunds issued either by our reject flow (refundOrder) or manually from the Stripe
    // dashboard — match the order by its PaymentIntent and mark it refunded. Only a FULL refund
    // flips the status: a partial refund (e.g. an accepted modification reduction) leaves it 'paid'.
    const charge = event.data.object as Stripe.Charge;
    const fullyRefunded = charge.amount_refunded >= charge.amount;
    const pi =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (pi && fullyRefunded) {
      await db.from("orders").update({ payment_status: "refunded" }).eq("payment_ref", pi);
    }
  }

  return NextResponse.json({ received: true });
}
