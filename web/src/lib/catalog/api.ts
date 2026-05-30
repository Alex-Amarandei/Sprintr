import { createClient } from "@/lib/supabase/client";
import type { CatalogDocument } from "./schema";

/**
 * Client-side catalog data access. Reads/writes catalog_versions and calls the
 * publish/draft RPCs from migration 3. No schema knowledge beyond the generated types.
 */

type DraftRow = {
  id: string;
  version: number;
  label: string | null;
  status: "draft" | "published" | "archived";
  document: unknown;
};

/** The latest existing draft for a shop, or null if there is none. */
export async function getLatestDraft(shopId: string): Promise<DraftRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("catalog_versions")
    .select("id, version, label, status, document")
    .eq("shop_id", shopId)
    .eq("status", "draft")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as DraftRow | null;
}

/** Clone the live version into a fresh draft (RPC). Returns the new draft row. */
export async function createDraft(
  shopId: string,
  label?: string
): Promise<DraftRow> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_catalog_draft", {
    p_shop_id: shopId,
    p_label: label,
  });
  if (error) throw error;
  return data as unknown as DraftRow;
}

/** Get the shop's existing draft, or create one by cloning the live version. */
export async function getOrCreateDraft(shopId: string): Promise<DraftRow> {
  const existing = await getLatestDraft(shopId);
  return existing ?? (await createDraft(shopId));
}

/** Persist the edited document onto a draft version row. */
export async function saveDraftDocument(
  versionId: string,
  document: CatalogDocument
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("catalog_versions")
    .update({ document })
    .eq("id", versionId);
  if (error) throw error;
}
