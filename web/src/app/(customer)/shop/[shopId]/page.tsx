import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { MapPin } from "lucide-react";
import { getSampleShop, getSampleCatalog } from "@/lib/catalog/samples";
import { AddItemCard } from "@/components/cart/AddItemCard";

export const metadata: Metadata = { title: "Magazin" };

interface Props {
  params: Promise<{ shopId: string }>;
}

export default async function ShopDetailPage({ params }: Props) {
  const { shopId } = await params;

  // TODO(BE): read the shop + its active catalog document from Supabase.
  const shop = getSampleShop(shopId);
  if (!shop) notFound();

  const items = getSampleCatalog(shopId);

  return (
    <Stack gap="lg">
      <Paper withBorder radius="lg" p="lg">
        <Title order={2}>{shop.name}</Title>
        <Text c="dimmed" mt={4}>
          {shop.description}
        </Text>
        <Group gap={4} mt="xs" c="dimmed">
          <MapPin size={14} />
          <Text size="sm">{shop.address}</Text>
        </Group>
      </Paper>

      <Title order={3}>Produse și servicii</Title>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {items.map((item) => (
          <AddItemCard key={item.id} item={item} shopId={shopId} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
