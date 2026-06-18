"use server";

import { createClient } from "@/lib/supabase/server";
import {
  finalizeModification,
  getStripe,
  notify,
  notifyShopMembers,
  revalidateBoth,
  round2,
  serviceClient,
} from "./modifications-internal";

/**
 * Shop-side order modification (signed adjustment + reason → customer acceptance).
 *
 * Flow: a shop member proposes an `adjustment` (positive = extra charge, negative = reduction) on a
 * placed order. The customer accepts or declines. On acceptance the order's total/payout move by the
 * adjustment (atomically, via `finalize_order_modification`), and payment is reconciled:
 *  - online reduction  → auto partial-refund the difference (refund must succeed before finalizing);
 *  - online extra      → a separate delta PaymentIntent the customer confirms (card);
 *  - cash (any)        → recorded only; settled at handover.
 *
 * Authorization is enforced here (membership for propose/cancel; ownership for respond); the actual
 * money + state transitions run as the service role. The webhook-only helpers live in
 * `modifications-internal.ts` so they are never exposed as client-callable actions.
 */

// Statuses in which the shop may still modify an order (accepted → before it's terminal).
const MODIFIABLE = new Set(["accepted", "in_progress", "ready_for_pickup", "in_delivery"]);

/** Shop proposes an adjustment (+ extra / − reduction) + reason; awaits the customer's acceptance. */
export async function proposeModification(
  orderId: string,
  adjustment: number,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  const adj = round2(adjustment);
  if (!Number.isFinite(adj) || adj === 0)
    return { ok: false, error: "Ajustarea trebuie să fie diferită de 0" };

  const { data: order } = await supabase
    .from("orders")
    .select("id, shop_id, total, status, customer_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Comanda nu a fost găsită" };

  // Authority: the caller must be a member of the order's shop (the customer can also read the order).
  const { data: isMember } = await supabase.rpc("is_shop_member", { p_shop_id: order.shop_id });
  if (!isMember) return { ok: false, error: "Nepermis" };
  if (!MODIFIABLE.has(order.status)) return { ok: false, error: "Comanda nu mai poate fi modificată" };

  const previousTotal = Number(order.total);
  const newTotal = round2(previousTotal + adj);
  if (newTotal < 0) return { ok: false, error: "Totalul rezultat nu poate fi negativ" };

  const db = serviceClient();
  // Fast-path check; the partial unique index `order_modifications_one_pending` is the real guard
  // (a concurrent insert throws 23505, handled below).
  const { data: existing } = await db
    .from("order_modifications")
    .select("id")
    .eq("order_id", orderId)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) return { ok: false, error: "Există deja o modificare în așteptare" };

  const { error } = await db.from("order_modifications").insert({
    order_id: orderId,
    adjustment: adj,
    reason: reason.trim() || null,
    status: "pending",
    previous_total: previousTotal,
    new_total: newTotal,
    created_by: user.id,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Există deja o modificare în așteptare" };
    return { ok: false, error: error.message };
  }

  await notify(
    db,
    order.customer_id,
    "Magazinul a propus o modificare",
    `Comanda #${orderId.slice(0, 8)} · ${adj > 0 ? "+" : "−"}${Math.abs(adj).toFixed(2)} RON`,
    `/order/${orderId}`,
  );
  revalidateBoth(orderId);
  return { ok: true };
}

/**
 * Customer accepts or declines a pending modification. For an online EXTRA charge it returns a
 * `clientSecret` for the delta PaymentIntent (the customer confirms with a card); otherwise it
 * finalizes immediately (online reduction → auto partial-refund first; cash → recorded).
 */
export async function respondToModification(
  modId: string,
  accept: boolean,
): Promise<{ ok: boolean; clientSecret?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  const { data: mod } = await supabase
    .from("order_modifications")
    .select("id, order_id, adjustment, status")
    .eq("id", modId)
    .maybeSingle();
  if (!mod) return { ok: false, error: "Modificarea nu a fost găsită" };
  if (mod.status !== "pending") return { ok: false, error: "Modificarea a fost deja procesată" };

  const db = serviceClient();
  const { data: order } = await db
    .from("orders")
    .select("id, customer_id, shop_id, status, payment_method, payment_status, payment_ref")
    .eq("id", mod.order_id)
    .single();
  if (!order || order.customer_id !== user.id) return { ok: false, error: "Nepermis" };

  // Decline is always allowed (even on a now-terminal order — it just closes the proposal).
  if (!accept) {
    await db
      .from("order_modifications")
      .update({ status: "declined", resolved_at: new Date().toISOString() })
      .eq("id", modId)
      .eq("status", "pending");
    await notifyShopMembers(db, order.shop_id, order.id, "Clientul a refuzat modificarea");
    revalidateBoth(order.id);
    return { ok: true };
  }

  // Accepting must not happen once the order has left the modifiable window (done/rejected/…).
  if (!MODIFIABLE.has(order.status)) return { ok: false, error: "Comanda nu mai poate fi modificată" };

  const adj = Number(mod.adjustment);
  const online = order.payment_method === "online" && order.payment_status === "paid";

  // Online EXTRA charge → bill the delta via a new PaymentIntent the customer confirms with a card.
  if (online && adj > 0) {
    try {
      const pi = await getStripe().paymentIntents.create(
        {
          amount: Math.round(adj * 100),
          currency: "ron",
          metadata: { order_id: order.id, modification_id: modId, kind: "modification" },
          // Card/wallets only — no redirect methods, matching the place-order flow.
          automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        },
        { idempotencyKey: `mod_${modId}` },
      );
      await db.from("order_modifications").update({ payment_intent: pi.id }).eq("id", modId);
      return { ok: true, clientSecret: pi.client_secret ?? undefined };
    } catch (e) {
      console.error("[mod] delta PaymentIntent failed", modId, e);
      return { ok: false, error: "Plata diferenței nu a putut fi inițializată. Încearcă din nou." };
    }
  }

  // Online REDUCTION → the partial refund must SUCCEED before we finalize (else the order total/payout
  // would drop with no money actually returned). On failure we leave it pending for a retry.
  if (online && adj < 0 && order.payment_ref) {
    try {
      await getStripe().refunds.create(
        { payment_intent: order.payment_ref, amount: Math.round(Math.abs(adj) * 100) },
        { idempotencyKey: `modrefund_${modId}` },
      );
    } catch (e) {
      console.error("[mod] partial refund failed", modId, e);
      return { ok: false, error: "Rambursarea nu a putut fi procesată. Încearcă din nou." };
    }
  }

  // Cash (any) or a successfully-refunded online reduction → finalize atomically.
  await finalizeModification(db, modId);
  await notifyShopMembers(db, order.shop_id, order.id, "Clientul a acceptat modificarea");
  revalidateBoth(order.id);
  return { ok: true };
}

/**
 * Client-driven fallback for the webhook: after the customer confirms the delta PaymentIntent,
 * verify it with Stripe and finalize the modification. Idempotent + safe alongside the webhook.
 */
export async function confirmModificationPayment(
  modId: string,
): Promise<{ ok: boolean; paid: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, paid: false, error: "Neautentificat" };

  const db = serviceClient();
  const { data: mod } = await db
    .from("order_modifications")
    .select("id, order_id, payment_intent, status, orders(customer_id, shop_id)")
    .eq("id", modId)
    .maybeSingle();
  if (!mod) return { ok: false, paid: false, error: "Modificarea nu a fost găsită" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ord = (mod as any).orders as { customer_id: string; shop_id: string } | null;
  if (!ord || ord.customer_id !== user.id) return { ok: false, paid: false, error: "Nepermis" };
  if (mod.status === "accepted") return { ok: true, paid: true };
  if (!mod.payment_intent) return { ok: false, paid: false, error: "Nicio plată asociată" };

  try {
    const pi = await getStripe().paymentIntents.retrieve(mod.payment_intent);
    if (pi.status !== "succeeded") return { ok: true, paid: false };
  } catch (e) {
    return { ok: false, paid: false, error: (e as Error).message };
  }

  await finalizeModification(db, modId);
  await notifyShopMembers(db, ord.shop_id, mod.order_id, "Clientul a plătit diferența");
  revalidateBoth(mod.order_id);
  return { ok: true, paid: true };
}

/** Shop cancels its own still-pending proposal (and any unconfirmed delta PaymentIntent). */
export async function cancelModification(modId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  const { data: mod } = await supabase
    .from("order_modifications")
    .select("id, order_id, status, payment_intent, orders(shop_id)")
    .eq("id", modId)
    .maybeSingle();
  if (!mod) return { ok: false, error: "Modificarea nu a fost găsită" };
  if (mod.status !== "pending") return { ok: false, error: "Modificarea a fost deja procesată" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shopId = (mod as any).orders?.shop_id as string | undefined;
  if (!shopId) return { ok: false, error: "Comanda nu a fost găsită" };

  const { data: isMember } = await supabase.rpc("is_shop_member", { p_shop_id: shopId });
  if (!isMember) return { ok: false, error: "Nepermis" };

  const db = serviceClient();
  // Cancel the unconfirmed delta PI (if the customer accepted an online extra but hasn't paid yet).
  if (mod.payment_intent) {
    try {
      await getStripe().paymentIntents.cancel(mod.payment_intent);
    } catch (e) {
      console.error("[mod] cancel PI failed", modId, e);
    }
  }
  await db
    .from("order_modifications")
    .update({ status: "cancelled", resolved_at: new Date().toISOString() })
    .eq("id", modId)
    .eq("status", "pending");
  revalidateBoth(mod.order_id);
  return { ok: true };
}
