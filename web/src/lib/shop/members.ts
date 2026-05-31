import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export type ShopRole = Database["public"]["Enums"]["shop_role"];

export interface ShopMember {
  profile_id: string;
  email: string;
  full_name: string | null;
  role: ShopRole;
  created_at: string;
}

/** Roster of a shop's members (any member may view) — names/emails via SECURITY DEFINER RPC. */
export async function listShopMembers(shopId: string): Promise<ShopMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("list_shop_members", { p_shop_id: shopId });
  if (error) throw error;
  return (data ?? []) as ShopMember[];
}

export interface ShopInvitation {
  email: string;
  role: ShopRole;
  created_at: string;
}

/**
 * Add a teammate by email. If they already have an account they're granted the role now
 * ("added"); otherwise a pending invitation is created and claimed on their first login
 * ("invited"). Owner only (enforced server-side).
 */
export async function addShopMember(
  shopId: string,
  email: string,
  role: ShopRole,
): Promise<"added" | "invited"> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("add_shop_member", {
    p_shop_id: shopId,
    p_email: email,
    p_role: role,
  });
  if (error) throw error;
  return (data as "added" | "invited") ?? "invited";
}

/** Change a member's role (promote/demote). Owner only; can't demote the last owner. */
export async function setShopMemberRole(
  shopId: string,
  profileId: string,
  role: ShopRole,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_shop_member_role", {
    p_shop_id: shopId,
    p_profile_id: profileId,
    p_role: role,
  });
  if (error) throw error;
}

/** Pending invitations (not yet claimed by a first login). */
export async function listShopInvitations(shopId: string): Promise<ShopInvitation[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("list_shop_invitations", { p_shop_id: shopId });
  if (error) throw error;
  return (data ?? []) as ShopInvitation[];
}

/** Cancel a pending invitation. Owner only. */
export async function cancelShopInvitation(shopId: string, email: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("cancel_shop_invitation", {
    p_shop_id: shopId,
    p_email: email,
  });
  if (error) throw error;
}

/** Remove a member. Owner only; the server refuses to remove the last owner. */
export async function removeShopMember(shopId: string, profileId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("remove_shop_member", {
    p_shop_id: shopId,
    p_profile_id: profileId,
  });
  if (error) throw error;
}
