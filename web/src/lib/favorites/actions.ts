"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Toggle a shop in the current user's favourites. Returns the new state. */
export async function toggleFavorite(
  shopId: string
): Promise<{ ok: boolean; favorited: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, favorited: false };

  const { data: existing } = await supabase
    .from("favorites")
    .select("shop_id")
    .eq("shop_id", shopId)
    .maybeSingle();

  if (existing) {
    await supabase.from("favorites").delete().eq("user_id", user.id).eq("shop_id", shopId);
    revalidatePath("/browse");
    return { ok: true, favorited: false };
  }
  await supabase.from("favorites").insert({ user_id: user.id, shop_id: shopId });
  revalidatePath("/browse");
  return { ok: true, favorited: true };
}
