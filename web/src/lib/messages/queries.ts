import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getActiveShopId } from "@/lib/shop/active";
import type { OrderStatus } from "@/lib/design/status";

/** One chat thread in the shop inbox (an order that has messages). */
export interface ShopConversation {
  orderId: string;
  customerId: string;
  customerName: string;
  status: OrderStatus;
  lastBody: string;
  lastFromCustomer: boolean;
  lastAtIso: string;
  unread: number;
}

/** All conversations for the current user's shop, newest activity first. */
export async function getShopConversations(): Promise<ShopConversation[]> {
  const shopId = await getActiveShopId();
  if (!shopId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("shop_conversations", { p_shop_id: shopId });
  if (error || !data) return [];
  return data.map((c) => ({
    orderId: c.order_id,
    customerId: c.customer_id,
    customerName: c.customer_name ?? "Client",
    status: c.status as OrderStatus,
    lastBody: c.last_body,
    lastFromCustomer: c.last_sender === c.customer_id,
    lastAtIso: c.last_at,
    unread: c.unread ?? 0,
  }));
}

/** Total unread customer messages for the current user's shop (sidebar dot). */
export async function getShopUnreadCount(): Promise<number> {
  const shopId = await getActiveShopId();
  if (!shopId) return 0;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("shop_unread_count", { p_shop_id: shopId });
  if (error || typeof data !== "number") return 0;
  return data;
}
