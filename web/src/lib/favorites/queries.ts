import "server-only";
import { createClient } from "@/lib/supabase/server";

/** The current user's favourited shop ids, or `null` when signed out (→ hide the heart). */
export async function getMyFavoriteShopIds(): Promise<string[] | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("favorites").select("shop_id");
  return (data ?? []).map((r) => r.shop_id);
}
