import "server-only";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Refund a paid ONLINE order (e.g. when the shop rejects it) and mark it `payment_status='refunded'`.
 *
 * No-op for cash / unpaid / already-refunded orders, and when Stripe isn't configured. Best-effort:
 * logs + returns false on failure rather than throwing — the rejection itself must still succeed, and
 * the `charge.refunded` webhook also catches refunds issued manually from the Stripe dashboard (so a
 * failed auto-refund can be recovered there). Service role: no user context, trusted server op.
 */
function serviceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function refundOrder(orderId: string): Promise<boolean> {
  if (!process.env.STRIPE_SECRET_KEY) return false;
  try {
    const db = serviceClient();
    const { data: order } = await db
      .from("orders")
      .select("payment_method, payment_status, payment_ref")
      .eq("id", orderId)
      .single();

    if (!order) return false;
    // Only online, actually-paid orders have something to refund.
    if (order.payment_method !== "online" || order.payment_status !== "paid" || !order.payment_ref)
      return false;

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiVersion: "2025-05-28.basil" as any,
    });
    // Idempotency: a retry for the same order won't issue a second refund.
    await stripe.refunds.create(
      { payment_intent: order.payment_ref },
      { idempotencyKey: `refund_${orderId}` },
    );

    await db.from("orders").update({ payment_status: "refunded" }).eq("id", orderId);
    return true;
  } catch (e) {
    console.error("[refund] failed for", orderId, e);
    return false;
  }
}
