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
  phones: string[];
  website: string;
  email: string;
  address: string;
  schedule: WeeklySchedule | null;
  /** Date-keyed exceptions (`{ "2026-05-31": null }` = closed). Drives the temporary pause. */
  scheduleOverrides: Record<string, { open: string; close: string } | null>;
  /** Hard on/off visibility flag (distinct from the temporary pause). */
  isActive: boolean;
  defaultEtaMinutes: number | null;
  deliveryFee: number;
  /** Platform commission as a fraction (e.g. 0.05 = 5%). Admin-set, owner-immutable — shown read-only. */
  commissionRate: number;
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
      "id, name, description, phones, website_url, email, address, logo_path, banner_path, schedule, schedule_overrides, default_eta_minutes, delivery_fee, commission_rate, active_version_id, is_active"
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
    phones: shop.phones ?? [],
    website: shop.website_url ?? "",
    email: shop.email ?? "",
    address: shop.address ?? "",
    schedule: (shop.schedule as WeeklySchedule | null) ?? null,
    scheduleOverrides:
      (shop.schedule_overrides as Record<string, { open: string; close: string } | null> | null) ?? {},
    isActive: shop.is_active ?? true,
    defaultEtaMinutes: shop.default_eta_minutes ?? null,
    deliveryFee: Number(shop.delivery_fee ?? 0),
    commissionRate: Number(shop.commission_rate ?? 0),
    logoPath: shop.logo_path ?? null,
    bannerPath: shop.banner_path ?? null,
    hasLogo: Boolean(shop.logo_path),
    hasBanner: Boolean(shop.banner_path),
    itemCount,
  };
}
