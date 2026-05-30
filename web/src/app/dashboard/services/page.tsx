import { Metadata } from "next";
import { Alert, Title } from "@mantine/core";
import { createClient } from "@/lib/supabase/server";
import { emptyDocument, parseDocument } from "@/lib/catalog/schema";
import { CatalogBuilder } from "@/components/catalog/CatalogBuilder";

export const metadata: Metadata = { title: "Catalog" };

export default async function ShopCatalogPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Resolve the shop this user belongs to (first membership).
  const { data: membership } = await supabase
    .from("shop_permissions")
    .select("shop_id, role")
    .eq("profile_id", user?.id ?? "")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return (
      <div>
        <Title order={2} mb="lg">
          Catalog
        </Title>
        <Alert color="yellow" variant="light" title="Niciun magazin asociat">
          Contul tău nu este asociat unui magazin. Un administrator trebuie să te
          adauge ca membru (rol „catalog" sau „owner") pentru a edita catalogul.
        </Alert>
      </div>
    );
  }

  const shopId = membership.shop_id;

  // Latest draft (if any) — what we edit.
  const { data: draft } = await supabase
    .from("catalog_versions")
    .select("id, version, document")
    .eq("shop_id", shopId)
    .eq("status", "draft")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

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

  return (
    <CatalogBuilder
      shopId={shopId}
      initialDraft={draft ?? null}
      activeDocument={activeDocument}
    />
  );
}
