import { Metadata } from "next";
import {
  Badge,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { Package, Pencil, Plus, Store } from "lucide-react";
import { getShopProducts } from "@/lib/catalog/products";
import { computeItemPrice } from "@/lib/catalog/pricing";
import { defaultAnswers } from "@/lib/catalog/answers";
import { formatPrice } from "@/lib/utils/format";
import { LinkButton } from "@/components/ui/links";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Produse" };

export default async function ShopProductsPage() {
  const data = await getShopProducts();

  if (!data) {
    return (
      <Stack gap="lg">
        <Title order={2}>Produse</Title>
        <EmptyState
          icon={<Store size={26} />}
          title="Niciun magazin asociat"
          description="Contul tău nu este asociat unui magazin. Contactează un administrator."
        />
      </Stack>
    );
  }

  const { products } = data;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Produse</Title>
          <Text c="dimmed">Produse fizice din catalogul tău.</Text>
        </div>
        <LinkButton href="/dashboard/products/new" leftSection={<Plus size={16} />}>
          Adaugă produs
        </LinkButton>
      </Group>

      {products.length === 0 ? (
        <EmptyState
          icon={<Package size={26} />}
          title="Niciun produs încă"
          description="Adaugă primul produs fizic din catalogul magazinului tău."
        />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {products.map((p) => {
            const from = computeItemPrice(p, defaultAnswers(p)).total;
            return (
              <Card key={p.id}>
                <Group justify="space-between" mb="sm">
                  <ThemeIcon variant="light" color="mist" size={48} radius="md">
                    <Package size={22} />
                  </ThemeIcon>
                  <Badge variant="light" color={p.is_active ? "teal" : "mist"}>
                    {p.is_active ? "În stoc" : "Indisponibil"}
                  </Badge>
                </Group>
                <Text fw={700}>{p.title}</Text>
                <Text fz="xs" c="dimmed" lineClamp={2} mt={2}>
                  {p.description}
                </Text>
                <Group justify="space-between" mt="md">
                  <Text fw={700}>{formatPrice(from)}</Text>
                  <LinkButton
                    href={`/dashboard/products/${p.id}/edit`}
                    variant="default"
                    size="xs"
                    leftSection={<Pencil size={14} />}
                  >
                    Editează
                  </LinkButton>
                </Group>
              </Card>
            );
          })}
        </SimpleGrid>
      )}
    </Stack>
  );
}
