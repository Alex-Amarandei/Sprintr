import { createClient } from "@/lib/supabase/client";
import {
  normalizeOfferInput,
  type OfferInput,
  type OfferRow,
} from "./types";

/**
 * Client-side offers CRUD for the shop dashboard (OffersManager / PromotionEditor) and the
 * customer cart's code lookup. All writes are gated by RLS (catalog+); reads return what the
 * caller is allowed to see (members: all of their shop's; anon/customer: live automatic only).
 */

/** All offers for a shop, newest first. Members see every offer; the public sees live automatic. */
export async function listShopOffers(shopId: string): Promise<OfferRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OfferRow[];
}

export async function createOffer(
  shopId: string,
  input: OfferInput,
): Promise<OfferRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("offers")
    .insert({ shop_id: shopId, ...normalizeOfferInput(input) })
    .select("*")
    .single();
  if (error) throw error;
  return data as OfferRow;
}

export async function updateOffer(
  id: string,
  input: OfferInput,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("offers")
    .update(normalizeOfferInput(input))
    .eq("id", id);
  if (error) throw error;
}

export async function setOfferActive(id: string, active: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("offers").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deleteOffer(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("offers").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Validate a typed promo code against a shop without exposing the shop's code list
 * (SECURITY DEFINER RPC). Returns the live code offer or null. Use for the cart's code field.
 */
export async function validateCode(
  shopId: string,
  code: string,
): Promise<OfferRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("validate_offer_code", {
    p_shop_id: shopId,
    p_code: code,
  });
  if (error) throw error;
  return (data as OfferRow | null) ?? null;
}
