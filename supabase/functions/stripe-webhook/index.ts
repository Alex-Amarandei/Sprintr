import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";

// Stripe sends webhooks with the raw body — do NOT parse as JSON before verifying.
Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!webhookSecret || !stripeKey || !sig) {
    return new Response("Stripe not configured", { status: 400 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-05-28.basil" });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Bad signature", { status: 400 });
  }

  const serviceSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const orderId = pi.metadata?.order_id;

    if (!orderId) {
      console.warn("payment_intent.succeeded with no order_id in metadata", pi.id);
      return new Response("ok"); // don't 4xx — Stripe will retry
    }

    const { error } = await serviceSupabase
      .from("orders")
      .update({
        payment_status: "paid",
        payment_ref: pi.id,
        paid_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error("Failed to mark order paid:", orderId, error);
      return new Response("DB error", { status: 500 });
    }

    console.log("Order marked paid:", orderId);
  } else if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const orderId = pi.metadata?.order_id;

    if (orderId) {
      await serviceSupabase
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("id", orderId);

      console.log("Order payment failed:", orderId);
    }
  }

  return new Response("ok");
});
