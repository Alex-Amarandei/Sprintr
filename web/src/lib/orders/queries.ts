import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getActiveShopId } from "@/lib/shop/active";
import { parseDocument, type Item } from "@/lib/catalog/schema";
import type { OrderStatus } from "@/lib/design/status";
import type { SampleOrder, SampleOrderLine, SampleMessage } from "./sample";

/**
 * Server-side reads of real orders, mapped into the `SampleOrder` UI shape.
 * RLS governs access (customer sees own; shop members see their shop's). On any
 * error/empty we return [] / null so the UI degrades instead of crashing.
 *
 * Known BE gaps (rendered as best-effort): no per-order ETA, no delivery-fee column
 * (we show total−subtotal), uploaded files aren't persisted in order_items, and a
 * shop may not be able to read a customer's profile name (→ "Client").
 */

const PAYMENT_LABEL: Record<string, string> = {
  cash_in_store: "Numerar la magazin",
  cash_on_delivery: "Numerar la livrare",
  online: "Card online",
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function relTime(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "Acum";
  if (min < 60) return `Acum ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Acum ${h} ${h === 1 ? "oră" : "ore"}`;
  const d = Math.round(h / 24);
  if (d === 1) return "Ieri";
  return new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "short" }).format(new Date(iso));
}

const timeOnly = (iso: string) =>
  new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

type RawItem = {
  item_id: string;
  item_title: string;
  kind: "service" | "product";
  quantity: number;
  answers: Record<string, unknown> | null;
  price_breakdown: Record<string, number> | null;
  line_total: number;
  files: { path: string; name: string }[] | null;
};

/** Build a readable config summary from answers using the catalog item's labels. */
export function summarize(answers: Record<string, unknown> | null, item?: Item): string {
  if (!answers) return "";
  if (!item) {
    return Object.values(answers)
      .filter((v) => typeof v === "string" || typeof v === "number")
      .map(String)
      .join(" · ");
  }
  const parts: string[] = [];
  for (const f of item.fields) {
    const v = answers[f.key];
    if (v == null || v === "" || v === false) continue;
    if (f.type === "single_select") {
      parts.push(f.options.find((o) => o.value === v)?.label ?? String(v));
    } else if (f.type === "multi_select" && Array.isArray(v)) {
      const labels = (v as string[]).map((x) => f.options.find((o) => o.value === x)?.label ?? x);
      if (labels.length) parts.push(labels.join(", "));
    } else if (f.type === "boolean") {
      parts.push(f.label);
    } else if (f.type === "number") {
      parts.push(`${v}${"unit" in f && f.unit ? ` ${f.unit}` : ""}`);
    }
  }
  return parts.join(" · ");
}

const ORDER_SELECT =
  "id, customer_id, shop_id, catalog_version_id, status, fulfilment, delivery_address, delivery_lat, delivery_lng, contact_phone, notes, subtotal, discount, shipping_fee, service_fee, total, adjustment, commission, payout, eta_minutes, payment_method, payment_status, courier_provider, courier_name, courier_phone, courier_status, courier_tracking_url, created_at, shops(name), order_items(item_id, item_title, kind, quantity, answers, price_breakdown, line_total, files)";

/** Format an ETA in minutes as a short label (e.g. "~30 min", "~1 h 20 min"). */
function etaLabel(min: number | null | undefined): string | undefined {
  if (min == null) return undefined;
  if (min < 60) return `~${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `~${h} h ${m} min` : `~${h} h`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toListOrder(o: any): SampleOrder {
  const items = (o.order_items ?? []) as RawItem[];
  const subtotal = Number(o.subtotal ?? 0);
  const total = Number(o.total ?? 0);
  return {
    id: o.id,
    shopId: o.shop_id,
    shopName: o.shops?.name ?? "Magazin",
    customerName: "Client",
    category: "print",
    itemsCount: items.length,
    total,
    status: o.status as OrderStatus,
    placedAt: relTime(o.created_at),
    eta: etaLabel(o.eta_minutes),
    etaMinutes: o.eta_minutes ?? null,
    subtotal,
    delivery: round2(total - subtotal),
    shippingFee: Number(o.shipping_fee ?? 0),
    serviceFee: Number(o.service_fee ?? 0),
    discount: Number(o.discount ?? 0),
    commission: Number(o.commission ?? 0),
    payout: Number(o.payout ?? 0),
    paymentMethod: PAYMENT_LABEL[o.payment_method] ?? o.payment_method,
    paymentStatus: o.payment_status,
    online: o.payment_method === "online",
    lines: items.map((it) => ({
      title: it.item_title,
      summary: "",
      lineTotal: Number(it.line_total),
    })),
    messages: [],
  };
}

/** Customer's own orders for /orders. */
export interface ShopStats {
  revenueTotal: number;
  revenueToday: number;
  payoutTotal: number;
  commissionTotal: number;
  ordersTotal: number;
  pending: number;
  inProgress: number;
  done: number;
  avgRating: number;
  reviewsCount: number;
}

/** Aggregated shop stats for the dashboard (member-gated RPC). */
export async function getShopStats(shopId: string): Promise<ShopStats | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("shop_stats", { p_shop_id: shopId });
  const r = data?.[0];
  if (!r) return null;
  return {
    revenueTotal: Number(r.revenue_total),
    revenueToday: Number(r.revenue_today),
    payoutTotal: Number(r.payout_total),
    commissionTotal: Number(r.commission_total),
    ordersTotal: Number(r.orders_total),
    pending: Number(r.pending),
    inProgress: Number(r.in_progress),
    done: Number(r.done),
    avgRating: Number(r.avg_rating),
    reviewsCount: Number(r.reviews_count),
  };
}

export interface TopItem {
  itemId: string;
  title: string;
  kind: "service" | "product";
  qty: number;
  orders: number;
  revenue: number;
  avgRating: number;
}

/** Best-selling catalog items (services + products) for the shop, by revenue. */
export async function getShopTopItems(shopId: string, limit = 5): Promise<TopItem[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("shop_top_items", { p_shop_id: shopId, p_limit: limit });
  return (data ?? []).map((r) => ({
    itemId: r.item_id,
    title: r.title,
    kind: r.kind,
    qty: Number(r.qty),
    orders: Number(r.orders),
    revenue: Number(r.revenue),
    avgRating: Number(r.avg_rating),
  }));
}

/** Daily completed-order revenue over the last `days` (zero-filled) for charts. */
export async function getShopRevenueDaily(
  shopId: string,
  days = 7,
): Promise<{ day: string; revenue: number }[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("shop_revenue_daily", {
    p_shop_id: shopId,
    p_days: days,
  });
  return (data ?? []).map((d) => ({ day: d.day, revenue: Number(d.revenue) }));
}

/** Order counts per status (for the analytics donut). */
export async function getShopStatusCounts(
  shopId: string,
): Promise<{ status: OrderStatus; count: number }[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("shop_status_counts", { p_shop_id: shopId });
  return (data ?? []).map((r) => ({ status: r.status, count: Number(r.count) }));
}

/** The caller's own order aggregates (customer dashboard). */
export async function getCustomerStats(): Promise<{
  ordersCount: number;
  totalSpent: number;
  totalSaved: number;
}> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("customer_stats");
  const r = data?.[0];
  return {
    ordersCount: Number(r?.orders_count ?? 0),
    totalSpent: Number(r?.total_spent ?? 0),
    totalSaved: Number(r?.total_saved ?? 0),
  };
}

export async function getMyOrders(): Promise<SampleOrder[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  // Filter to the caller's OWN orders explicitly — a shop member also passes the
  // orders_select_shop RLS, so without this they'd see the whole shop's orders here.
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(toListOrder);
}

/** The shop the current user belongs to (id + storefront fields), or null. */
export async function getMyShop(): Promise<{
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  delivery_fee: number;
  default_eta_minutes: number | null;
  schedule: import("@/types/database").Json | null;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const shopId = await getActiveShopId();
  if (!shopId) return null;
  const { data: shop } = await supabase
    .from("shops")
    .select("id, name, description, phone, email, address, delivery_fee, default_eta_minutes, schedule")
    .eq("id", shopId)
    .maybeSingle();
  return shop ?? null;
}

/** New (pending) + in-progress order counts for the active shop — drives the Comenzi nav badges. */
export async function getShopOrderCounts(): Promise<{ pending: number; inProgress: number }> {
  const supabase = await createClient();
  const shopId = await getActiveShopId();
  if (!shopId) return { pending: 0, inProgress: 0 };
  // Same visibility rule as getShopOrders: count only placed orders (hide unpaid online; a paid
  // order later refunded still counts as placed).
  const placed = "payment_method.neq.online,payment_status.eq.paid,payment_status.eq.refunded";
  const [pendingRes, progressRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId)
      .eq("status", "pending")
      .or(placed),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId)
      .in("status", ["accepted", "in_progress", "in_delivery"])
      .or(placed),
  ]);
  return { pending: pendingRes.count ?? 0, inProgress: progressRes.count ?? 0 };
}

/** Orders for the shop the current user belongs to (dashboard queue). */
export async function getShopOrders(): Promise<SampleOrder[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const shopId = await getActiveShopId();
  if (!shopId) return [];

  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("shop_id", shopId)
    // An order reaches the shop only once it's actually placed: cash orders immediately, but
    // ONLINE orders only after payment succeeds. An unpaid online order is an abandoned/incomplete
    // checkout — it must NOT appear in the queue or fire a "new order" alert. We accept 'refunded'
    // alongside 'paid' because a refund always implies the charge was captured first: an online
    // order the shop later REJECTS (auto-refunded → 'refunded') or refunds manually must STAY in its
    // history, not vanish. Online orders flip to 'paid' via the Stripe webhook / confirmOrderPayment.
    .or("payment_method.neq.online,payment_status.eq.paid,payment_status.eq.refunded")
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  // Resolve customer identity. Shop members can now read name/phone/email of their own
  // customers (profiles_select_shop_customer RLS); falls back to "Client" if unavailable.
  const ids = [...new Set(data.map((o: any) => o.customer_id))];
  const profiles: Record<string, { full_name: string | null; phone: string | null; email: string }> = {};
  if (ids.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, phone, email")
      .in("id", ids);
    for (const p of profs ?? []) profiles[p.id] = p;
  }
  return data.map((o: any) => {
    const p = profiles[o.customer_id];
    return {
      ...toListOrder(o),
      customerName: p?.full_name ?? "Client",
      customerPhone: p?.phone ?? undefined,
      customerEmail: p?.email ?? undefined,
    };
  });
}

/** Full order detail (works for both customer + shop; RLS authorizes). */
export async function getOrderDetail(id: string): Promise<SampleOrder | null> {
  const supabase = await createClient();
  const { data: o, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error || !o) return null;
  const order = o as any;

  // Customer identity. The customer reads their own row; a shop member reads it via the
  // profiles_select_shop_customer policy. Phone/email are only used on the shop detail.
  let customerName = "Client";
  let customerPhone: string | undefined;
  let customerEmail: string | undefined;
  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name, phone, email")
    .eq("id", order.customer_id)
    .maybeSingle();
  if (prof?.full_name) customerName = prof.full_name;
  customerPhone = prof?.phone ?? undefined;
  customerEmail = prof?.email ?? undefined;

  // Catalog doc → field labels for the config summary.
  let catalogItems: Item[] = [];
  if (order.catalog_version_id) {
    const { data: ver } = await supabase
      .from("catalog_versions")
      .select("document")
      .eq("id", order.catalog_version_id)
      .maybeSingle();
    catalogItems = parseDocument(ver?.document).items;
  }

  // Messages — split into the order thread and the post-completion complaint thread.
  const { data: msgs } = await supabase
    .from("messages")
    .select("sender_id, body, created_at, kind")
    .eq("order_id", id)
    .order("created_at", { ascending: true });
  const toMsg = (m: { sender_id: string; body: string; created_at: string }): SampleMessage => ({
    from: m.sender_id === order.customer_id ? "customer" : "shop",
    body: m.body,
    at: timeOnly(m.created_at),
  });
  const messages: SampleMessage[] = (msgs ?? []).filter((m) => m.kind !== "complaint").map(toMsg);
  const complaintMessages: SampleMessage[] = (msgs ?? []).filter((m) => m.kind === "complaint").map(toMsg);

  const items = (order.order_items ?? []) as RawItem[];
  const lines: SampleOrderLine[] = items.map((it) => ({
    itemId: it.item_id,
    title: it.item_title,
    summary: summarize(it.answers, catalogItems.find((ci) => ci.id === it.item_id)),
    lineTotal: Number(it.line_total),
    pdfName: it.files?.[0]?.name,
    files: (it.files ?? []).map((f) => ({ name: f.name })),
  }));

  const subtotal = Number(order.subtotal ?? 0);
  const total = Number(order.total ?? 0);
  return {
    id: order.id,
    shopId: order.shop_id,
    shopName: order.shops?.name ?? "Magazin",
    customerName,
    customerId: order.customer_id,
    customerPhone,
    customerEmail,
    category: "print",
    itemsCount: lines.length,
    total,
    status: order.status as OrderStatus,
    placedAt: relTime(order.created_at),
    eta: etaLabel(order.eta_minutes),
    etaMinutes: order.eta_minutes ?? null,
    subtotal,
    delivery: round2(total - subtotal),
    shippingFee: Number(order.shipping_fee ?? 0),
    serviceFee: Number(order.service_fee ?? 0),
    discount: Number(order.discount ?? 0),
    adjustment: Number(order.adjustment ?? 0),
    commission: Number(order.commission ?? 0),
    payout: Number(order.payout ?? 0),
    lines,
    messages,
    complaintMessages,
    notes: order.notes ?? undefined,
    contactPhone: order.contact_phone ?? undefined,
    deliveryAddress: order.delivery_address ?? undefined,
    deliveryLat: order.delivery_lat ?? undefined,
    deliveryLng: order.delivery_lng ?? undefined,
    courierProvider: order.courier_provider ?? undefined,
    courierName: order.courier_name ?? undefined,
    courierPhone: order.courier_phone ?? undefined,
    courierStatus: order.courier_status ?? undefined,
    courierTrackingUrl: order.courier_tracking_url ?? undefined,
    fulfilment: order.fulfilment ?? undefined,
    paymentMethod: PAYMENT_LABEL[order.payment_method] ?? order.payment_method,
    paymentStatus: order.payment_status,
    online: order.payment_method === "online",
  };
}

export interface OrderModificationView {
  id: string;
  /** Signed: positive = extra charge, negative = reduction. */
  adjustment: number;
  reason: string | null;
  status: "pending" | "accepted" | "declined" | "cancelled";
  previousTotal: number;
  newTotal: number;
}

/** The latest modification for an order (the live one to act on), or null. RLS scopes to participants. */
export async function getOrderModification(orderId: string): Promise<OrderModificationView | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("order_modifications")
    .select("id, adjustment, reason, status, previous_total, new_total, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    adjustment: Number(data.adjustment),
    reason: data.reason,
    status: data.status,
    previousTotal: Number(data.previous_total),
    newTotal: Number(data.new_total),
  };
}
