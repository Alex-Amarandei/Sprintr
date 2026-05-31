"use server";

import Stripe from "stripe";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * Verify an online order's Stripe PaymentIntent and mark it paid — a client-driven
 * fallback for the Stripe webhook (which may not be running locally / may be unconfigured).
 * Idempotent and safe to run alongside the webhook; both just set payment_status='paid'.
 * Returns paid=false if the intent hasn't succeeded yet. The customer cannot fake this —
 * Stripe is the source of truth.
 */
export async function confirmOrderPayment(
  orderId: string
): Promise<{ ok: boolean; paid: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, paid: false, error: "Unauthorized" };

  // RLS lets the customer read their own order.
  const { data: order } = await supabase
    .from("orders")
    .select("id, customer_id, payment_ref, payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.customer_id !== user.id)
    return { ok: false, paid: false, error: "Comanda nu a fost găsită" };
  if (order.payment_status === "paid") return { ok: true, paid: true };
  if (!order.payment_ref)
    return { ok: false, paid: false, error: "Comanda nu are o plată asociată" };

  // Confirm with Stripe.
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiVersion: "2025-05-28.basil" as any,
  });
  try {
    const pi = await stripe.paymentIntents.retrieve(order.payment_ref);
    if (pi.status !== "succeeded") return { ok: true, paid: false };
  } catch (e) {
    return { ok: false, paid: false, error: (e as Error).message };
  }

  // Mark paid via service role (the orders UPDATE policy is shop/admin-only).
  const db = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { error } = await db
    .from("orders")
    .update({ payment_status: "paid", paid_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("payment_ref", order.payment_ref);
  if (error) return { ok: false, paid: false, error: error.message };

  return { ok: true, paid: true };
}
