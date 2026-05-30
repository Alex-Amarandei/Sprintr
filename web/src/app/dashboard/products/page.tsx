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
import { Package, Pencil, Plus } from "lucide-react";
import { sampleCatalog } from "@/lib/catalog/samples";
import { computeItemPrice } from "@/lib/catalog/pricing";
import { defaultAnswers } from "@/lib/catalog/answers";
import { formatPrice } from "@/lib/utils/format";
import { LinkButton } from "@/components/ui/links";

export const metadata: Metadata = { title: "Produse" };

export default function ShopProductsPage() {
  // TODO(BE): read this shop's products from the active catalog version.
  const products = sampleCatalog.filter((i) => i.kind === "product");

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Produse</Title>
          <Text c="dimmed">Produse fizice, fără configurare.</Text>
        </div>
        <LinkButton href="/dashboard/products/new" leftSection={<Plus size={16} />}>
          Adaugă produs
        </LinkButton>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {products.map((p) => {
          const from = computeItemPrice(p, defaultAnswers(p)).total;
          return (
            <Card key={p.id}>
              <Group justify="space-between" mb="sm">
                <ThemeIcon variant="light" color="mist" size={48} radius="md">
                  <Package size={22} />
                </ThemeIcon>
                <Badge variant="light" color="teal">
                  În stoc
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
    </Stack>
  );
}
