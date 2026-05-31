"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveShopId } from "@/lib/shop/active";
import type { OrderStatus } from "@/lib/design/status";
import type { ExportRow } from "./sample";

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

  const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
  if (error) return { ok: false, error: error.message };

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

  const { error } = await supabase.from("orders").update({ eta_minutes: eta }).eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath(`/order/${orderId}`);
  return { ok: true };
}
