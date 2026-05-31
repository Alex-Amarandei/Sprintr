import { Badge, Divider, Group, SimpleGrid, Stack, Title } from "@mantine/core";
import type { Category, Item } from "@/lib/catalog/schema";
import { AddItemCard } from "@/components/cart/AddItemCard";
import { roCount } from "@/lib/utils/format";

/**
 * Shop catalog, grouped into per-shop category sections (`document.categories`).
 * Items reference a category via `category_id`; anything without one falls under
 * "Altele". When the shop has defined no categories, it degrades to a single grid.
 */
export function ShopCatalogTabs({
  items,
  categories,
  shopId,
  shopName,
  shopOpen,
}: {
  items: Item[];
  categories: Category[];
  shopId: string;
  shopName: string;
  shopOpen: boolean;
}) {
  const grid = (list: Item[]) => (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
      {list.map((item) => (
        <AddItemCard
          key={item.id}
          item={item}
          shopId={shopId}
          shopName={shopName}
          shopOpen={shopOpen}
        />
      ))}
    </SimpleGrid>
  );

  // Build ordered, non-empty category sections from the document's categories.
  const known = new Set(categories.map((c) => c.id));
  const sections = [...categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({
      id: c.id,
      name: c.name,
      items: items.filter((i) => i.category_id === c.id),
    }))
    .filter((s) => s.items.length > 0);

  const uncategorized = items.filter(
    (i) => !i.category_id || !known.has(i.category_id)
  );

  // No real category sections → just show everything in one grid.
  if (sections.length === 0) return grid(items);

  if (uncategorized.length > 0) {
    sections.push({ id: "__other", name: "Altele", items: uncategorized });
  }

  return (
    <Stack gap={40}>
      {sections.map((sec) => (
        <div key={sec.id}>
          <Group gap="sm" align="center" mb={4}>
            <Title order={4}>{sec.name}</Title>
            <Badge variant="light" color="mist" radius="sm" size="sm">
              {roCount(sec.items.length, "produs", "produse")}
            </Badge>
          </Group>
          <Divider mb="lg" />
          {grid(sec.items)}
        </div>
      ))}
    </Stack>
  );
}
