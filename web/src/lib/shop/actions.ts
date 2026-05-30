"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ShopProfileInput } from "./types";

/**
 * Update the shop's storefront profile. RLS authorizes (owner-only).
 * `schedule` editing is a separate concern (jsonb) — TODO(BE) wire the per-day hours.
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
    })
    .eq("id", shopId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/profile");
  return { ok: true };
}
