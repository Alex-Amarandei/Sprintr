import { Metadata } from "next";
import { Stack, Title } from "@mantine/core";
import { Store } from "lucide-react";
import { loadCatalogEditor } from "@/lib/catalog/editor";
import { PromotionEditor } from "@/components/dashboard/PromotionEditor";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Promoție nouă" };

export default async function NewPromotionPage() {
  const data = await loadCatalogEditor();
  if (!data || !data.canEdit) {
    return (
      <Stack gap="lg">
        <Title order={2}>Promoție nouă</Title>
        <EmptyState
          icon={<Store size={26} />}
          title="Acces insuficient"
          description="Doar membrii cu rol „catalog” sau „owner” pot crea promoții."
        />
      </Stack>
    );
  }

  return (
    <PromotionEditor
      shopId={data.shopId}
      items={data.activeDocument.items}
      categories={data.activeDocument.categories}
    />
  );
}
