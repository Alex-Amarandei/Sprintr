import { Metadata } from "next";
import { Stack, Title } from "@mantine/core";
import { Store } from "lucide-react";
import { loadCatalogEditor } from "@/lib/catalog/editor";
import { CatalogBuilder } from "@/components/catalog/CatalogBuilder";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Servicii" };

export default async function ShopServicesPage() {
  const data = await loadCatalogEditor();

  if (!data) {
    return (
      <Stack gap="lg">
        <Title order={2}>Servicii</Title>
        <EmptyState
          icon={<Store size={26} />}
          title="Niciun magazin asociat"
          description="Contul tău nu este asociat unui magazin. Contactează un administrator pentru a edita catalogul."
        />
      </Stack>
    );
  }

  return (
    <CatalogBuilder
      shopId={data.shopId}
      kind="service"
      canEdit={data.canEdit}
      initialDraft={data.draft}
      activeDocument={data.activeDocument}
      activeVersionId={data.activeVersionId}
    />
  );
}
