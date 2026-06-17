"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getActiveShopId, ACTIVE_SHOP_COOKIE } from "./active";
import { bucharestDateKey } from "./schedule";
import { forwardGeocode } from "@/lib/geo/geocode";
import type { ShopProfileInput } from "./types";
import type { Database, Json } from "@/types/database";

/**
 * Switch the active shop (multi-shop owners). Validates membership, writes the
 * `sprintr.active_shop` cookie, and revalidates the dashboard so every shop-scoped
 * read re-resolves against the new shop.
 */
export async function setActiveShop(shopId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { data: m } = await supabase
    .from("shop_permissions")
    .select("shop_id")
    .eq("profile_id", user.id)
    .eq("shop_id", shopId)
    .maybeSingle();
  if (!m) return { ok: false };

  const store = await cookies();
  store.set(ACTIVE_SHOP_COOKIE, shopId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

/**
 * Update the shop's storefront profile, including the recurring weekly `schedule`
 * (jsonb). RLS authorizes (owner-only).
 */
export async function updateShopProfile(
  shopId: string,
  input: ShopProfileInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  // Geocode the address → coordinates (for the delivery-radius check). Only when the address
  // actually changed or the shop has no coords yet, to avoid re-geocoding (and rate-limiting
  // Nominatim) on every save. On failure we leave the existing coords untouched.
  let coords: { lat: number; lng: number } | null = null;
  if (input.address?.trim()) {
    const { data: current } = await supabase
      .from("shops")
      .select("address, lat, lng")
      .eq("id", shopId)
      .maybeSingle();
    const changed = (current?.address ?? "").trim() !== input.address.trim();
    const missing = current?.lat == null || current?.lng == null;
    if (changed || missing) coords = await forwardGeocode(input.address);
  }

  const { error } = await supabase
    .from("shops")
    .update({
      name: input.name,
      description: input.description || null,
      phones: (input.phones ?? []).map((p) => p.trim()).filter(Boolean),
      website_url: input.website?.trim() || null,
      email: input.email || null,
      address: input.address || null,
      ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      schedule: input.schedule,
      // Only touch delivery_fee when provided, so saves that omit it don't reset it to 0.
      ...(input.deliveryFee !== undefined
        ? { delivery_fee: Math.max(0, Math.round(input.deliveryFee * 100) / 100) }
        : {}),
      // Likewise for the per-shop default ETA — only when explicitly provided.
      ...(input.defaultEtaMinutes !== undefined
        ? {
            default_eta_minutes:
              input.defaultEtaMinutes == null
                ? null
                : Math.max(0, Math.round(input.defaultEtaMinutes)),
          }
        : {}),
    })
    .eq("id", shopId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/profile");
  // The storefront reads this shop's schedule/contact — refresh it too.
  revalidatePath(`/shop/${shopId}`);
  return { ok: true };
}

/**
 * Save (or clear) the shop's logo / banner storage path. The file is uploaded client-side
 * to the public `shop-assets` bucket first; this persists the resulting path. RLS authorizes
 * (owner-only `shops` update).
 */
export async function setShopImage(
  shopId: string,
  kind: "logo" | "banner",
  path: string | null
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const patch = kind === "logo" ? { logo_path: path } : { banner_path: path };
  const { error } = await supabase.from("shops").update(patch).eq("id", shopId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/profile");
  revalidatePath(`/shop/${shopId}`);
  revalidatePath("/browse");
  return { ok: true };
}

/**
 * Temporary pause: close the storefront through `untilDate` (inclusive) by writing `null`
 * (= closed) `schedule_overrides` entries per day — `isOpenNow` already honours these over the
 * weekly schedule, so the open/closed badge + order gating flip automatically. Passing `null`
 * resumes (clears today-and-future pause entries). No `is_active` column — this IS the mechanism.
 */
export async function setShopPause(
  untilDate: string | null
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };
  const shopId = await getActiveShopId();
  if (!shopId) return { ok: false, error: "Niciun magazin asociat" };

  const { data: shop } = await supabase
    .from("shops")
    .select("schedule_overrides")
    .eq("id", shopId)
    .maybeSingle();

  const overrides: Record<string, Json> = {
    ...((shop?.schedule_overrides as Record<string, Json> | null) ?? {}),
  };
  // Bucharest calendar "today" so the pause range agrees with the (Bucharest-aware) reader.
  const today = bucharestDateKey();

  // Clear any existing pause first (closed entries from today onward), then re-apply.
  for (const key of Object.keys(overrides)) {
    if (key >= today && overrides[key] === null) delete overrides[key];
  }
  if (untilDate) {
    const end = untilDate < today ? today : untilDate;
    const d = new Date(`${today}T00:00:00Z`);
    const endDate = new Date(`${end}T00:00:00Z`);
    let guard = 0;
    while (d <= endDate && guard++ < 400) {
      overrides[d.toISOString().slice(0, 10)] = null;
      d.setUTCDate(d.getUTCDate() + 1);
    }
  }

  const { error } = await supabase
    .from("shops")
    .update({
      schedule_overrides:
        overrides as unknown as Database["public"]["Tables"]["shops"]["Update"]["schedule_overrides"],
    })
    .eq("id", shopId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/profile");
  revalidatePath(`/shop/${shopId}`);
  revalidatePath("/browse");
  return { ok: true };
}

/**
 * Hard on/off visibility switch (`shops.is_active`) — distinct from the temporary pause above.
 * Deactivating hides the shop from browse AND makes its storefront unreachable by direct URL;
 * the owner can still reach the dashboard (RLS lets members read their own shop) to reactivate.
 * Owner-gated by the `shops_update_owner` RLS policy.
 */
export async function setShopActive(
  active: boolean
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };
  const shopId = await getActiveShopId();
  if (!shopId) return { ok: false, error: "Niciun magazin asociat" };

  const { error } = await supabase
    .from("shops")
    .update({ is_active: active })
    .eq("id", shopId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/profile");
  revalidatePath(`/shop/${shopId}`);
  revalidatePath("/browse");
  return { ok: true };
}
