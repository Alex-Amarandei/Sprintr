import { Metadata } from "next";
import { Stack, Title } from "@mantine/core";
import { Store } from "lucide-react";
import { getShopProducts } from "@/lib/catalog/products";
import { ProductEditor } from "@/components/dashboard/ProductEditor";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Adaugă produs" };

export default async function NewProductPage() {
  const data = await getShopProducts();

  if (!data) {
    return (
      <Stack gap="lg">
        <Title order={2}>Adaugă produs</Title>
        <EmptyState
          icon={<Store size={26} />}
          title="Niciun magazin asociat"
          description="Contul tău nu este asociat unui magazin. Contactează un administrator."
        />
      </Stack>
    );
  }

  return <ProductEditor mode="new" shopId={data.shopId} />;
}
