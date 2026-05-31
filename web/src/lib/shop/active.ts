import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * Active-shop selection. A user can belong to several shops (`shop_permissions`); the
 * dashboard scopes everything to ONE active shop, chosen via the `sprintr.active_shop`
 * cookie and falling back to the first membership. The switcher (setActiveShop action)
 * writes the cookie; every shop-scoped read resolves it here instead of taking `.limit(1)`.
 */

export const ACTIVE_SHOP_COOKIE = "sprintr.active_shop";

type ShopRole = Database["public"]["Enums"]["shop_role"];

export interface ShopMembership {
  id: string;
  name: string;
  role: ShopRole;
}

/** All shops the current user is a member of (with their role), sorted by name. */
export const getMyShops = cache(async (): Promise<ShopMembership[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("shop_permissions")
    .select("shop_id, role, shops(name)")
    .eq("profile_id", user.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[])
    .map((r) => ({ id: r.shop_id as string, name: r.shops?.name ?? "Magazin", role: r.role as ShopRole }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

/** The active membership: cookie choice if still valid, else the first membership. */
export const getActiveMembership = cache(async (): Promise<ShopMembership | null> => {
  const shops = await getMyShops();
  if (shops.length === 0) return null;
  const store = await cookies();
  const pref = store.get(ACTIVE_SHOP_COOKIE)?.value;
  return shops.find((s) => s.id === pref) ?? shops[0];
});

/** Convenience: just the active shop's id (null if the user belongs to no shop). */
export async function getActiveShopId(): Promise<string | null> {
  return (await getActiveMembership())?.id ?? null;
}
