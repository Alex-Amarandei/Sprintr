import "server-only";

import { revalidatePath } from "next/cache";
import Stripe from "stripe";
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Server-only internals for order modifications. These are NOT React Server Actions (this file has
 * no "use server"), so they are never exposed as client-callable endpoints — only trusted server
 * code (the Stripe webhook, advanceOrderStatus, and the modifications actions) imports them.
 */

export type Db = SupabaseClient<Database>;

export function serviceClient(): Db {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export function getStripe() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-05-28.basil" as any });
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function revalidateBoth(orderId: string) {
  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath(`/order/${orderId}`);
}

export async function notify(db: Db, userId: string, title: string, body: string, href: string) {
  await db.from("notifications").insert({ user_id: userId, type: "order_status", title, body, href });
}

export async function notifyShopMembers(db: Db, shopId: string, orderId: string, title: string) {
  const { data: members } = await db
    .from("shop_permissions")
    .select("profile_id")
    .eq("shop_id", shopId);
  if (!members?.length) return;
  await db.from("notifications").insert(
    members.map((m) => ({
      user_id: m.profile_id,
      type: "order_status",
      title,
      body: `Comanda #${orderId.slice(0, 8)}`,
      href: `/dashboard/orders/${orderId}`,
    })),
  );
}

/**
 * Atomically finalize a pending modification (flip → accepted AND apply the adjustment to the order
 * total/payout/adjustment in one transaction, via the `finalize_order_modification` RPC). Returns
 * true only for the caller that performed the transition — so the webhook + the client fallback can
 * never double-apply the adjustment, even firing concurrently.
 */
export async function finalizeModification(db: Db, modId: string): Promise<boolean> {
  const { data, error } = await db.rpc("finalize_order_modification", { p_mod_id: modId });
  if (error) {
    console.error("[mod] finalize RPC failed", modId, error);
    return false;
  }
  return data === true;
}

/** Stripe-webhook entry point: a modification's delta PaymentIntent succeeded → finalize it. */
export async function finalizeModificationById(modId: string): Promise<void> {
  const db = serviceClient();
  const applied = await finalizeModification(db, modId);
  if (!applied) return;
  const { data: mod } = await db
    .from("order_modifications")
    .select("order_id, orders(shop_id)")
    .eq("id", modId)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderId = (mod as any)?.order_id as string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shopId = (mod as any)?.orders?.shop_id as string | undefined;
  if (orderId && shopId) await notifyShopMembers(db, shopId, orderId, "Clientul a plătit diferența");
  if (orderId) revalidateBoth(orderId);
}

/**
 * Cancel any still-pending modifications when an order goes terminal (rejected/done), cancelling
 * their unconfirmed delta PaymentIntents too. Best-effort; called from advanceOrderStatus.
 */
export async function cancelPendingModificationsForOrder(orderId: string): Promise<void> {
  const db = serviceClient();
  const { data: pend } = await db
    .from("order_modifications")
    .select("id, payment_intent")
    .eq("order_id", orderId)
    .eq("status", "pending");
  if (!pend?.length) return;
  for (const m of pend) {
    if (m.payment_intent) {
      try {
        await getStripe().paymentIntents.cancel(m.payment_intent);
      } catch (e) {
        // PI may already be confirmed/cancelled — best-effort.
        console.error("[mod] cancel PI failed", m.id, e);
      }
    }
  }
  await db
    .from("order_modifications")
    .update({ status: "cancelled", resolved_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .eq("status", "pending");
}
