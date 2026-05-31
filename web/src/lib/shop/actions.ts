"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ShopProfileInput } from "./types";

/**
 * Update the shop's storefront profile, including the recurring weekly `schedule`
 * (jsonb). RLS authorizes (owner-only).
 */
export async function updateShopProfile(
  shopId: string,
  input: ShopProfileInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shops")
    .update({
      name: input.name,
      description: input.description || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
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
