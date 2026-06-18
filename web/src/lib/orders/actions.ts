"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveShopId } from "@/lib/shop/active";
import { getShopCatalog, getShopView } from "@/lib/catalog/shops";
import { cancelCourierForOrder, dispatchCourierForOrder } from "@/lib/delivery/dispatch";
import { refundOrder } from "./refund";
import {
  cancelPendingModificationsForOrder,
  getStripe,
  notify,
  round2,
  serviceClient,
} from "./modifications-internal";
import { roCount } from "@/lib/utils/format";
import type { FileTypeKey } from "@/lib/catalog/schema";
import { isTerminalStatus, type OrderStatus } from "@/lib/design/status";
import type { ExportRow } from "./sample";

export interface ReorderPayload {
  shopId: string;
  shopName: string;
  shopOpen: boolean;
  deliveryFee: number;
  lines: {
    itemId: string;
    title: string;
    kind: "service" | "product";
    answers: Record<string, unknown>;
    total: number;
    /** Whether the item requires a file upload (so the cart can prompt to re-attach it). */
    requiresUpload: boolean;
    /** Shop's allowed file types — enforced when re-attaching in the basket. */
    acceptedFileTypes: FileTypeKey[];
  }[];
}

/**
 * Rebuild a cart from a past order (frozen `order_items`) so the customer can re-order in one
 * tap. RLS scopes the order to the caller. Files aren't restored (in-memory only) — the
 * customer re-attaches if the item requires an upload.
 */
export async function getReorderPayload(orderId: string): Promise<ReorderPayload | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: order } = await supabase
    .from("orders")
    .select("shop_id, order_items(item_id, item_title, kind, answers, line_total)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return null;

  const [shop, catalog] = await Promise.all([
    getShopView(order.shop_id),
    getShopCatalog(order.shop_id),
  ]);
  if (!shop) return null;
  // Map current catalog items → whether they require an upload, so a reordered requires-upload
  // line carries the flag (the cart then prompts to re-attach the file, which isn't restored).
  const requiresUpload = new Map(catalog.items.map((i) => [i.id, i.requires_upload]));
  const acceptedTypes = new Map(catalog.items.map((i) => [i.id, i.accepted_file_types]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (order.order_items ?? []) as any[];
  return {
    shopId: order.shop_id,
    shopName: shop.name,
    shopOpen: shop.isOpen ?? true,
    deliveryFee: shop.deliveryFee ?? 0,
    lines: items.map((it) => ({
      itemId: it.item_id,
      title: it.item_title,
      kind: it.kind,
      answers: (it.answers ?? {}) as Record<string, unknown>,
      total: Number(it.line_total),
      requiresUpload: requiresUpload.get(it.item_id) ?? false,
      acceptedFileTypes: acceptedTypes.get(it.item_id) ?? [],
    })),
  };
}

/**
 * Shop-side report export: orders matching a date range + status filter (RLS scopes to the
 * caller's shop). Includes archived orders. Used by the export modal to build a CSV.
 */
export async function exportShopOrders(opts: {
  from?: string;
  to?: string;
  statuses: OrderStatus[];
}): Promise<ExportRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const shopId = await getActiveShopId();
  if (!shopId) return [];

  let q = supabase
    .from("orders")
    .select("id, created_at, status, total, commission, payout, payment_method")
    .eq("shop_id", shopId)
    // Same "actually placed" rule as getShopOrders: never include an unpaid online order (an
    // abandoned checkout) in a shop report — otherwise the manual-payout CSV would credit the shop
    // a `payout` for money the platform never collected. Refunded orders stay in for audit.
    .or("payment_method.neq.online,payment_status.eq.paid,payment_status.eq.refunded")
    .order("created_at", { ascending: false });
  if (opts.from) q = q.gte("created_at", opts.from);
  if (opts.to) q = q.lt("created_at", opts.to);
  if (opts.statuses.length) q = q.in("status", opts.statuses);

  const { data } = await q;
  return (data ?? []).map((o) => ({
    id: o.id,
    createdAt: o.created_at,
    status: o.status as OrderStatus,
    total: Number(o.total),
    commission: Number(o.commission),
    payout: Number(o.payout),
    paymentMethod: o.payment_method,
  }));
}

/**
 * Shop-side: advance an order's status (accept/reject/in_progress/done).
 * RLS authorizes (shop staff+). On accept we stamp `handled_by` = current member.
 */
export async function advanceOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  const patch: { status: OrderStatus; handled_by?: string } = { status };
  if (status === "accepted") patch.handled_by = user.id;

  // Concurrency guard: only advance from a valid predecessor, so two staff acting at once
  // can't both apply (and overwrite `handled_by`). The update no-ops if someone already moved it.
  const VALID_PREV: Record<OrderStatus, OrderStatus[]> = {
    pending: [],
    accepted: ["pending"],
    rejected: ["pending"],
    in_progress: ["accepted"],
    // Pickup leg.
    ready_for_pickup: ["in_progress"],
    picked_up: ["ready_for_pickup", "in_progress"],
    // Delivery leg.
    in_delivery: ["in_progress"],
    delivered: ["in_delivery"],
    // Legacy terminal (kept for older orders).
    done: ["in_progress", "in_delivery"],
  };
  const prevs = VALID_PREV[status] ?? [];

  let q = supabase.from("orders").update(patch).eq("id", orderId);
  if (prevs.length) q = q.in("status", prevs);
  const { data, error } = await q.select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0)
    return { ok: false, error: "Comanda a fost deja actualizată de altcineva." };

  // Order is packed + going out → request an external courier (Glovo) for the delivery leg.
  // Fully gated (no-op unless a provider is configured) + best-effort (never throws), so it can't
  // block or break the status change — the shop just falls back to its own delivery on failure.
  if (status === "in_delivery") {
    await dispatchCourierForOrder(orderId);
  } else if (status === "rejected") {
    // Cancel any already-dispatched courier so it isn't left hanging (gated + best-effort).
    await cancelCourierForOrder(orderId);
    // Refund a paid online order — the customer must get their money back on rejection. Best-effort
    // (logs on failure; the charge.refunded webhook + a manual Stripe refund are the safety net).
    await refundOrder(orderId);
  }

  // A terminal order can no longer be modified — cancel any pending proposal (and its unconfirmed
  // delta PaymentIntent) so the customer can't accept/pay a now-moot change.
  if (isTerminalStatus(status)) {
    await cancelPendingModificationsForOrder(orderId);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
  return { ok: true };
}

/**
 * Shop-side: set/clear the per-order ETA (minutes). RLS scopes updates to the shop's own
 * orders (customers can't update orders), so this is effectively shop-only. Visible to both
 * sides on the order detail.
 */
export async function setOrderEta(
  orderId: string,
  etaMinutes: number | null
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  const eta =
    etaMinutes == null || Number.isNaN(etaMinutes) ? null : Math.max(0, Math.round(etaMinutes));
  // Freeze the estimate as an absolute target timestamp set NOW — the UI shows `eta_at − now` as a
  // live countdown (the minutes are just the input; the diff is never recomputed server-side).
  const etaAt = eta == null ? null : new Date(Date.now() + eta * 60_000).toISOString();

  const { error } = await supabase
    .from("orders")
    .update({ eta_minutes: eta, eta_at: etaAt })
    .eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath(`/order/${orderId}`);
  return { ok: true };
}

/**
 * Shop rejects a SUBSET of an order's lines (e.g. out of stock) rather than the whole order. The
 * rejected lines are struck from the order; for a paid online order the customer is partial-refunded
 * the rejected goods FIRST, then the order subtotal/total/payout are reduced atomically (the RPC only
 * counts the newly-rejected lines, so a re-submit can't double-reduce). At least one line must remain.
 */
export async function rejectOrderLines(
  orderId: string,
  lineIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };
  if (!lineIds?.length) return { ok: false, error: "Selectează cel puțin un produs" };

  const { data: order } = await supabase
    .from("orders")
    .select("id, shop_id, customer_id, status, payment_method, payment_status, payment_ref")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Comanda nu a fost găsită" };

  const { data: isMember } = await supabase.rpc("is_shop_member", { p_shop_id: order.shop_id });
  if (!isMember) return { ok: false, error: "Nepermis" };
  if (isTerminalStatus(order.status))
    return { ok: false, error: "Comanda nu mai poate fi modificată" };

  const db = serviceClient();
  const { data: items } = await db
    .from("order_items")
    .select("id, line_total, rejected")
    .eq("order_id", orderId);
  const all = items ?? [];
  const wanted = new Set(lineIds);
  const targets = all.filter((i) => wanted.has(i.id) && !i.rejected);
  if (!targets.length) return { ok: false, error: "Produsele selectate sunt deja respinse" };
  if (all.filter((i) => !i.rejected && !wanted.has(i.id)).length === 0)
    return { ok: false, error: "Nu poți respinge toate produsele — respinge întreaga comandă." };

  const refundAmount = round2(targets.reduce((s, i) => s + Number(i.line_total), 0));
  const online = order.payment_method === "online" && order.payment_status === "paid";

  // Paid online → refund the rejected goods BEFORE reducing the order (refund must succeed first).
  if (online && refundAmount > 0 && order.payment_ref) {
    try {
      await getStripe().refunds.create(
        { payment_intent: order.payment_ref, amount: Math.round(refundAmount * 100) },
        {
          idempotencyKey: `reject_${orderId}_${targets
            .map((t) => t.id)
            .sort()
            .join("")
            .slice(0, 200)}`,
        },
      );
    } catch (e) {
      console.error("[reject] partial refund failed", orderId, e);
      return { ok: false, error: "Rambursarea nu a putut fi procesată. Încearcă din nou." };
    }
  }

  await db.rpc("reject_order_lines", {
    p_order_id: orderId,
    p_line_ids: targets.map((t) => t.id),
  });

  await notify(
    db,
    order.customer_id,
    "Produse indisponibile",
    `Comanda #${orderId.slice(0, 8)} · ${roCount(targets.length, "produs indisponibil", "produse indisponibile")}`,
    `/order/${orderId}`,
  );

  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath(`/order/${orderId}`);
  return { ok: true };
}
