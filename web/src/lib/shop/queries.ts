import "server-only";
import { createClient } from "@/lib/supabase/server";
import { parseDocument } from "@/lib/catalog/schema";
import { getActiveShopId } from "./active";
import type { WeeklySchedule } from "./schedule";

/**
 * Full storefront profile for the current user's shop (dashboard Profil page).
 * Carries the real fields needed to compute the profile-completeness status:
 * logo/banner presence, description, weekly schedule, and the live catalog size.
 * Returns null when the user belongs to no shop.
 */
export interface ShopProfileData {
  shopId: string;
  name: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  schedule: WeeklySchedule | null;
  defaultEtaMinutes: number | null;
  deliveryFee: number;
  logoPath: string | null;
  bannerPath: string | null;
  hasLogo: boolean;
  hasBanner: boolean;
  /** Number of items in the live (published) catalog — drives the "≥ 5 produse" check. */
  itemCount: number;
}

export async function loadShopProfile(): Promise<ShopProfileData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const shopId = await getActiveShopId();
  if (!shopId) return null;

  const { data: shop } = await supabase
    .from("shops")
    .select(
      "id, name, description, phone, email, address, logo_path, banner_path, schedule, default_eta_minutes, delivery_fee, active_version_id"
    )
    .eq("id", shopId)
    .maybeSingle();
  if (!shop) return null;

  let itemCount = 0;
  if (shop.active_version_id) {
    const { data: ver } = await supabase
      .from("catalog_versions")
      .select("document")
      .eq("id", shop.active_version_id)
      .maybeSingle();
    itemCount = parseDocument(ver?.document).items.length;
  }

  return {
    shopId: shop.id,
    name: shop.name ?? "",
    description: shop.description ?? "",
    phone: shop.phone ?? "",
    email: shop.email ?? "",
    address: shop.address ?? "",
    schedule: (shop.schedule as WeeklySchedule | null) ?? null,
    defaultEtaMinutes: shop.default_eta_minutes ?? null,
    deliveryFee: Number(shop.delivery_fee ?? 0),
    logoPath: shop.logo_path ?? null,
    bannerPath: shop.banner_path ?? null,
    hasLogo: Boolean(shop.logo_path),
    hasBanner: Boolean(shop.banner_path),
    itemCount,
  };
}
