import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/shop/active";
import { emptyDocument, parseDocument, type CatalogDocument } from "./schema";

/**
 * Resolves everything the <CatalogBuilder> needs for the current user's shop:
 * the shop id, the caller's shop role (→ whether they may edit), the latest draft,
 * and the live/active document. Shared by the Servicii and Produse pages so the two
 * stay in lock-step. Returns null when the user belongs to no shop.
 *
 * Edit rights follow the catalog spec: only `catalog` or `owner` may create/edit
 * drafts and publish; `staff` is view-only (RLS enforces this server-side too).
 */
export interface CatalogEditorData {
  shopId: string;
  role: string;
  canEdit: boolean;
  draft: { id: string; version: number; document: unknown } | null;
  activeDocument: CatalogDocument;
  activeVersionId: string | null;
}

export async function loadCatalogEditor(): Promise<CatalogEditorData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // The active shop this user is operating + their role there.
  const membership = await getActiveMembership();
  if (!membership) return null;

  const shopId = membership.id;
  const role = membership.role;
  const canEdit = role === "catalog" || role === "owner";

  // Latest draft (if any) — what we edit. Only relevant to editors; view-only members
  // (staff) always see the live/active document.
  const { data: draft } = canEdit
    ? await supabase
        .from("catalog_versions")
        .select("id, version, document")
        .eq("shop_id", shopId)
        .eq("status", "draft")
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  // Active (published) document — read-only preview when not editing.
  const { data: shop } = await supabase
    .from("shops")
    .select("active_version_id")
    .eq("id", shopId)
    .maybeSingle();

  let activeDocument = emptyDocument;
  if (shop?.active_version_id) {
    const { data: activeVersion } = await supabase
      .from("catalog_versions")
      .select("document")
      .eq("id", shop.active_version_id)
      .maybeSingle();
    activeDocument = parseDocument(activeVersion?.document);
  }

  return {
    shopId,
    role,
    canEdit,
    draft: draft ?? null,
    activeDocument,
    activeVersionId: shop?.active_version_id ?? null,
  };
}
