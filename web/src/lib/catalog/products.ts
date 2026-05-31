import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getActiveShopId } from "@/lib/shop/active";
import { emptyDocument, parseDocument, type CatalogDocument, type Item } from "./schema";

type DbClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Server-side reads of a shop's PRODUCTS from its catalog `document`.
 * Products are catalog items with `kind === "product"`, living in the same
 * versioned document as services. We read the latest DRAFT if one exists
 * (so unpublished edits show in the dashboard), else the live active version.
 */

async function resolveShopId(_supabase: DbClient): Promise<string | null> {
  return getActiveShopId();
}

async function loadEditableDocument(
  supabase: DbClient,
  shopId: string
): Promise<CatalogDocument> {
  const { data: draft } = await supabase
    .from("catalog_versions")
    .select("document")
    .eq("shop_id", shopId)
    .eq("status", "draft")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (draft) return parseDocument(draft.document);

  const { data: shop } = await supabase
    .from("shops")
    .select("active_version_id")
    .eq("id", shopId)
    .maybeSingle();
  if (shop?.active_version_id) {
    const { data: active } = await supabase
      .from("catalog_versions")
      .select("document")
      .eq("id", shop.active_version_id)
      .maybeSingle();
    return parseDocument(active?.document);
  }
  return emptyDocument;
}

/** This shop's products (+ shopId), or null if the user has no shop. */
export async function getShopProducts(): Promise<{
  shopId: string;
  products: Item[];
} | null> {
  const supabase = await createClient();
  const shopId = await resolveShopId(supabase);
  if (!shopId) return null;
  const doc = await loadEditableDocument(supabase, shopId);
  const products = doc.items
    .filter((i) => i.kind === "product")
    .sort((a, b) => a.sort_order - b.sort_order);
  return { shopId, products };
}

/** One product by stable id (+ shopId), or null if not found / no shop. */
export async function getShopProduct(
  productId: string
): Promise<{ shopId: string; item: Item } | null> {
  const supabase = await createClient();
  const shopId = await resolveShopId(supabase);
  if (!shopId) return null;
  const doc = await loadEditableDocument(supabase, shopId);
  const item = doc.items.find((i) => i.id === productId && i.kind === "product");
  return item ? { shopId, item } : null;
}
