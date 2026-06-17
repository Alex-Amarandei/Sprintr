"use server";

import { createClient } from "@/lib/supabase/server";
import { glovoEstimate, isGlovoEnabled } from "./glovo";

/**
 * Quote the courier delivery fee for a drop-off point (checkout preview). Returns null when no
 * provider is configured or coordinates are missing — the checkout then falls back to the shop's
 * own `delivery_fee`. The server re-quotes authoritatively at placement (place-order).
 */
export async function quoteDelivery(
  shopId: string,
  lat: number,
  lng: number,
): Promise<{ provider: string; fee: number; currency: string } | null> {
  if (!isGlovoEnabled()) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const supabase = await createClient();
  const { data: shop } = await supabase
    .from("shops")
    .select("name, phone, address, lat, lng")
    .eq("id", shopId)
    .eq("is_active", true)
    .maybeSingle();
  if (shop?.lat == null || shop?.lng == null) return null;

  const quote = await glovoEstimate(
    {
      lat: shop.lat,
      lng: shop.lng,
      address: shop.address ?? "",
      contactName: shop.name,
      contactPhone: shop.phone,
    },
    { lat, lng, address: "" },
  );
  return quote ? { provider: quote.provider, fee: quote.fee, currency: quote.currency } : null;
}
