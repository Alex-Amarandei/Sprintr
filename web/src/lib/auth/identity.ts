import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveMembership, getMyShops, type ShopMembership } from "@/lib/shop/active";

/**
 * The logged-in viewer: display name + Google avatar (from OAuth `user_metadata`, no
 * profiles column) + their shop memberships and the active one. Powers the header
 * profile menu, the dashboard greeting, and the company/role badges.
 */
export interface ViewerIdentity {
  id: string;
  name: string;
  firstName: string;
  email: string;
  /** Google profile picture from OAuth metadata, or null (→ initials fallback). */
  avatarUrl: string | null;
  shops: ShopMembership[];
  activeShop: ShopMembership | null;
}

export const getViewerIdentity = cache(async (): Promise<ViewerIdentity | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const email = prof?.email ?? user.email ?? "";
  const name =
    prof?.full_name ||
    (meta.full_name as string) ||
    (meta.name as string) ||
    email.split("@")[0] ||
    "Cont";
  const avatarUrl = (meta.avatar_url as string) || (meta.picture as string) || null;

  const shops = await getMyShops();
  const activeShop = await getActiveMembership();

  return {
    id: user.id,
    name,
    firstName: name.split(" ")[0],
    email,
    avatarUrl,
    shops,
    activeShop,
  };
});
