import { createClient } from "@/lib/supabase/server";
import { isOfferLive } from "@/lib/catalog/offers";
import type { OfferRow } from "./types";

/**
 * Server-only reads for the customer-facing offer display (shop page banner / carousel).
 * Returns only LIVE AUTOMATIC offers — the public face of a shop's promotions. (Typed-code
 * offers are intentionally excluded; they're applied via the code field at checkout.)
 */
export async function getActiveOffers(shopId: string): Promise<OfferRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("shop_id", shopId)
    .eq("trigger", "automatic")
    .order("created_at", { ascending: false });
  if (error) throw error;
  // RLS already restricts public reads to live offers, but filter explicitly so a logged-in
  // member (who can read inactive ones too) still only gets live offers for the storefront.
  return ((data ?? []) as OfferRow[]).filter((o) => isOfferLive(o));
}
