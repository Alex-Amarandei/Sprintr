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
      address: input.address || null,
      schedule: input.schedule,
      // Only touch delivery_fee when provided, so saves that omit it don't reset it to 0.
      ...(input.deliveryFee !== undefined
        ? { delivery_fee: Math.max(0, Math.round(input.deliveryFee * 100) / 100) }
        : {}),
    })
    .eq("id", shopId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/profile");
  // The storefront reads this shop's schedule/contact — refresh it too.
  revalidatePath(`/shop/${shopId}`);
  return { ok: true };
}
