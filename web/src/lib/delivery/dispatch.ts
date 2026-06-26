import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { GLOVO_PROVIDER, glovoCancel, glovoCreateDelivery, isGlovoEnabled } from "./glovo";

/**
 * Orchestrates external courier dispatch for a delivery order. Provider-agnostic entry point —
 * today it routes to Glovo. Uses the service role (trusted server op triggered by the shop's
 * "send to delivery" action) to read the order + shop and freeze the courier result.
 *
 * FULLY GATED + BEST-EFFORT: a no-op when no provider is configured, and it NEVER throws — a
 * failure just leaves the order without an external courier (the shop falls back to its own
 * delivery / the existing flow). So enabling/wiring this can't break the live order pipeline.
 */
function serviceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function dispatchCourierForOrder(orderId: string): Promise<void> {
  if (!isGlovoEnabled()) return;
  try {
    const db = serviceClient();
    const { data: order } = await db
      .from("orders")
      .select(
        "id, fulfilment, delivery_address, delivery_lat, delivery_lng, contact_phone, courier_ref, shops(name, phone, address, lat, lng)",
      )
      .eq("id", orderId)
      .single();

    if (!order) return;
    if (order.fulfilment !== "delivery") return; // pickup → no courier needed
    if (order.courier_ref) return; // already dispatched — idempotent

    const shop = order.shops as unknown as {
      name: string;
      phone: string | null;
      address: string | null;
      lat: number | null;
      lng: number | null;
    } | null;

    // Both endpoints are required for a courier — degrade silently if either is missing.
    if (shop?.lat == null || shop?.lng == null) return;
    if (order.delivery_lat == null || order.delivery_lng == null) return;

    const dispatch = await glovoCreateDelivery({
      pickup: {
        lat: shop.lat,
        lng: shop.lng,
        address: shop.address ?? "",
        contactName: shop.name,
        contactPhone: shop.phone,
        details: "Ridicare comandă Sprintr",
      },
      dropoff: {
        lat: order.delivery_lat,
        lng: order.delivery_lng,
        address: order.delivery_address ?? "",
        contactPhone: order.contact_phone,
      },
      description: `Comandă Sprintr #${order.id.slice(0, 8)}`,
    });
    if (!dispatch) return;

    await db
      .from("orders")
      .update({
        courier_provider: GLOVO_PROVIDER,
        courier_ref: dispatch.ref,
        courier_status: dispatch.status,
        courier_tracking_url: dispatch.trackingUrl ?? null,
        courier_name: dispatch.courierName ?? null,
        courier_phone: dispatch.courierPhone ?? null,
      })
      .eq("id", orderId);
  } catch (e) {
    console.error("[delivery] dispatchCourierForOrder failed:", e);
  }
}

/**
 * Cancel a dispatched courier (e.g. when the order is rejected). Gated + best-effort + idempotent:
 * a no-op when there's no dispatched courier or no provider configured; never throws.
 */
export async function cancelCourierForOrder(orderId: string): Promise<void> {
  if (!isGlovoEnabled()) return;
  try {
    const db = serviceClient();
    const { data: order } = await db
      .from("orders")
      .select("courier_ref, courier_provider")
      .eq("id", orderId)
      .single();
    if (!order?.courier_ref || order.courier_provider !== GLOVO_PROVIDER) return;
    await glovoCancel(order.courier_ref);
    await db.from("orders").update({ courier_status: "CANCELED" }).eq("id", orderId);
  } catch (e) {
    console.error("[delivery] cancelCourierForOrder failed:", e);
  }
}
