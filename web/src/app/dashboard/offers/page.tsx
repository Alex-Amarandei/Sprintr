import { Metadata } from "next";
import { Stack, Title } from "@mantine/core";
import { Store } from "lucide-react";
import { loadCatalogEditor } from "@/lib/catalog/editor";
import { getShopOffers } from "@/lib/offers/queries";
import { OffersManager } from "@/components/dashboard/OffersManager";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Oferte" };

export default async function ShopOffersPage() {
  const data = await loadCatalogEditor();
  if (!data) {
    return (
      <Stack gap="lg">
        <Title order={2}>Oferte</Title>
        <EmptyState
          icon={<Store size={26} />}
          title="Niciun magazin asociat"
          description="Contul tău nu este asociat unui magazin. Contactează un administrator."
        />
      </Stack>
    );
  }

  const offers = await getShopOffers(data.shopId);

  return (
    <OffersManager
      canEdit={data.canEdit}
      initialOffers={offers}
      items={data.activeDocument.items}
      categories={data.activeDocument.categories}
    />
  );
}
