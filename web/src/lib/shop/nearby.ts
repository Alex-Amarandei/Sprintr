"use server";

import { createClient } from "@/lib/supabase/server";
import { haversineKm, MAX_DELIVERY_KM } from "@/lib/geo/geocode";

export interface NearbyShop {
  id: string;
  name: string;
  address: string;
  /** Distance from the customer's point, in km (1 decimal). */
  distanceKm: number;
}

/**
 * Shops within the delivery radius of a customer point, nearest first — to suggest alternatives
 * when the chosen shop is too far. Only shops that have set coordinates are considered.
 */
export async function findNearbyShops(
  lat: number,
  lng: number,
  excludeId?: string,
  limit = 4,
): Promise<NearbyShop[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("shops")
    .select("id, name, address, lat, lng")
    .eq("is_active", true)
    .not("lat", "is", null)
    .not("lng", "is", null);
  if (!data) return [];

  return data
    .filter((s) => s.id !== excludeId && s.lat != null && s.lng != null)
    .map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address ?? "",
      distanceKm:
        Math.round(haversineKm({ lat, lng }, { lat: s.lat as number, lng: s.lng as number }) * 10) /
        10,
    }))
    .filter((s) => s.distanceKm <= MAX_DELIVERY_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
