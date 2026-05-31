import "server-only";
import { createClient } from "@/lib/supabase/server";
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
};

/** Build a readable config summary from answers using the catalog item's labels. */
function summarize(answers: Record<string, unknown> | null, item?: Item): string {
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
  "id, customer_id, shop_id, catalog_version_id, status, fulfilment, delivery_address, contact_phone, notes, subtotal, total, payment_method, created_at, shops(name), order_items(item_id, item_title, kind, quantity, answers, price_breakdown, line_total)";

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
    subtotal,
    delivery: round2(total - subtotal),
    lines: items.map((it) => ({
      title: it.item_title,
      summary: "",
      lineTotal: Number(it.line_total),
    })),
    messages: [],
  };
}

/** Customer's own orders for /orders. */
export async function getMyOrders(): Promise<SampleOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
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
  address: string | null;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membership } = await supabase
    .from("shop_permissions")
    .select("shop_id")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) return null;
  const { data: shop } = await supabase
    .from("shops")
    .select("id, name, description, phone, address")
    .eq("id", membership.shop_id)
    .maybeSingle();
  return shop ?? null;
}

/** Orders for the shop the current user belongs to (dashboard queue). */
export async function getShopOrders(): Promise<SampleOrder[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: membership } = await supabase
    .from("shop_permissions")
    .select("shop_id")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) return [];

  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("shop_id", membership.shop_id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  // Resolve customer names (best-effort — RLS may hide them → "Client").
  const ids = [...new Set(data.map((o: any) => o.customer_id))];
  const names: Record<string, string> = {};
  if (ids.length) {
    const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    for (const p of profs ?? []) if (p.full_name) names[p.id] = p.full_name;
  }
  return data.map((o: any) => ({
    ...toListOrder(o),
    customerName: names[o.customer_id] ?? "Client",
  }));
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

  // Customer name (best-effort).
  let customerName = "Client";
  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", order.customer_id)
    .maybeSingle();
  if (prof?.full_name) customerName = prof.full_name;

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

  // Messages (read-only; no realtime in this pass).
  const { data: msgs } = await supabase
    .from("messages")
    .select("sender_id, body, created_at")
    .eq("order_id", id)
    .order("created_at", { ascending: true });
  const messages: SampleMessage[] = (msgs ?? []).map((m) => ({
    from: m.sender_id === order.customer_id ? "customer" : "shop",
    body: m.body,
    at: timeOnly(m.created_at),
  }));

  const items = (order.order_items ?? []) as RawItem[];
  const lines: SampleOrderLine[] = items.map((it) => ({
    title: it.item_title,
    summary: summarize(it.answers, catalogItems.find((ci) => ci.id === it.item_id)),
    lineTotal: Number(it.line_total),
  }));

  const subtotal = Number(order.subtotal ?? 0);
  const total = Number(order.total ?? 0);
  return {
    id: order.id,
    shopId: order.shop_id,
    shopName: order.shops?.name ?? "Magazin",
    customerName,
    customerId: order.customer_id,
    category: "print",
    itemsCount: lines.length,
    total,
    status: order.status as OrderStatus,
    placedAt: relTime(order.created_at),
    subtotal,
    delivery: round2(total - subtotal),
    lines,
    messages,
    notes: order.notes ?? undefined,
    contactPhone: order.contact_phone ?? undefined,
    deliveryAddress: order.delivery_address ?? undefined,
    fulfilment: order.fulfilment ?? undefined,
    paymentMethod: PAYMENT_LABEL[order.payment_method] ?? order.payment_method,
  };
}
