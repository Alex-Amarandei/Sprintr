import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-05-28.basil" as any });

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
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
  }

  return NextResponse.json({ received: true });
}
