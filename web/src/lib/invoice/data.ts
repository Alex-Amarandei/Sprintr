import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { parseDocument, type Item } from "@/lib/catalog/schema";
import { summarize } from "@/lib/orders/queries";
import { ORDER_STATUS } from "@/lib/design/status";

/**
 * Loads everything an invoice/receipt needs from a FROZEN order, via the service client
 * (the caller authorizes first — see the route). Pulls accurate shop + customer details and
 * the full money breakdown that the order view-model lumps together.
 */

const PAYMENT_LABEL: Record<string, string> = {
  cash_in_store: "Numerar la magazin",
  cash_on_delivery: "Numerar la livrare",
  online: "Card online",
};
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Neplătită",
  paid: "Plătită",
  failed: "Eșuată",
  refunded: "Rambursată",
};

export interface InvoiceLine {
  title: string;
  summary: string;
  quantity: number;
  lineTotal: number;
}

/** Shop fiscal/financial identifiers (shown when present — receipt, not a fiscal factură). */
export interface ShopLegal {
  legalName: string | null;
  fiscalCode: string | null; // CUI
  regCom: string | null;
  vatNumber: string | null; // only when vat_payer
}

export interface InvoiceData {
  orderShortId: string;
  date: string;
  statusLabel: string;
  shop: {
    name: string;
    address: string | null;
    phone: string | null;
    legal: ShopLegal | null;
  };
  customer: { name: string; phone: string | null };
  fulfilment: "delivery" | "pickup";
  deliveryAddress: string | null;
  notes: string | null;
  paymentMethod: string;
  paymentStatus: string;
  lines: InvoiceLine[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  serviceFee: number;
  total: number;
  appliedOffers: { name: string; amount: number }[];
}

type AppliedOffer = { id?: string; name: string; amount: number };

export async function buildInvoiceData(
  orderId: string,
  db: SupabaseClient<Database>,
): Promise<InvoiceData | null> {
  const { data: order } = await db
    .from("orders")
    .select(
      "id, customer_id, shop_id, catalog_version_id, status, fulfilment, delivery_address, contact_phone, notes, subtotal, discount, shipping_fee, service_fee, total, payment_method, payment_status, applied_offers, created_at, shops(name, address, phone), order_items(item_id, item_title, quantity, answers, line_total)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return null;

  // Catalog document → field labels for the per-line config summary.
  let catalogItems: Item[] = [];
  if (order.catalog_version_id) {
    const { data: ver } = await db
      .from("catalog_versions")
      .select("document")
      .eq("id", order.catalog_version_id)
      .maybeSingle();
    catalogItems = parseDocument(ver?.document).items;
  }

  // Accurate customer name (service client bypasses the profiles RLS gap).
  const { data: prof } = await db
    .from("profiles")
    .select("full_name, phone")
    .eq("id", order.customer_id)
    .maybeSingle();

  // Shop fiscal data (owner-only by RLS, but the service client reads it). Shown if present.
  const { data: legalRow } = await db
    .from("shop_legal")
    .select("legal_name, fiscal_code, reg_com, vat_payer, vat_number")
    .eq("shop_id", order.shop_id)
    .maybeSingle();
  const legal: ShopLegal | null =
    legalRow &&
    (legalRow.legal_name || legalRow.fiscal_code || legalRow.reg_com || legalRow.vat_number)
      ? {
          legalName: legalRow.legal_name,
          fiscalCode: legalRow.fiscal_code,
          regCom: legalRow.reg_com,
          vatNumber: legalRow.vat_payer ? legalRow.vat_number : null,
        }
      : null;

  const shop = (order.shops ?? null) as {
    name: string;
    address: string | null;
    phone: string | null;
  } | null;

  const items = (order.order_items ?? []) as Array<{
    item_id: string;
    item_title: string;
    quantity: number;
    answers: Record<string, unknown> | null;
    line_total: number;
  }>;

  return {
    orderShortId: order.id.slice(0, 8),
    date: new Intl.DateTimeFormat("ro-RO", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(order.created_at)),
    statusLabel: ORDER_STATUS[order.status]?.label ?? order.status,
    shop: {
      name: shop?.name ?? "Magazin",
      address: shop?.address ?? null,
      phone: shop?.phone ?? null,
      legal,
    },
    customer: {
      name: prof?.full_name ?? "Client",
      phone: order.contact_phone ?? prof?.phone ?? null,
    },
    fulfilment: order.fulfilment,
    deliveryAddress: order.delivery_address,
    notes: order.notes,
    paymentMethod: PAYMENT_LABEL[order.payment_method] ?? order.payment_method,
    paymentStatus: PAYMENT_STATUS_LABEL[order.payment_status] ?? order.payment_status,
    lines: items.map((it) => ({
      title: it.item_title,
      summary: summarize(it.answers, catalogItems.find((ci) => ci.id === it.item_id)),
      quantity: Number(it.quantity),
      lineTotal: Number(it.line_total),
    })),
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    shippingFee: Number(order.shipping_fee),
    serviceFee: Number(order.service_fee),
    total: Number(order.total),
    appliedOffers: ((order.applied_offers ?? []) as AppliedOffer[]).map((o) => ({
      name: o.name,
      amount: Number(o.amount),
    })),
  };
}
