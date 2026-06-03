"use client";

import { useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { Search, X } from "lucide-react";
import type { Category, Item } from "@/lib/catalog/schema";
import { AddItemCard } from "@/components/cart/AddItemCard";
import { roCount } from "@/lib/utils/format";

/**
 * Shop catalog with an in-store search, grouped into per-shop category sections
 * (`document.categories`). The search filters the shop's items by title, description and
 * category name; empty sections disappear. Without categories it degrades to a single grid.
 */
export function ShopCatalogTabs({
  items,
  categories,
  shopId,
  shopName,
  shopOpen,
  shopDeliveryFee,
  shopLat,
  shopLng,
}: {
  items: Item[];
  categories: Category[];
  shopId: string;
  shopName: string;
  shopOpen: boolean;
  shopDeliveryFee: number;
  shopLat: number | null;
  shopLng: number | null;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const catNames = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  const filtered = useMemo(() => {
    if (!q) return items;
    return items.filter((i) => {
      const cat = i.category_id ? catNames.get(i.category_id) ?? "" : "";
      return `${i.title} ${i.description ?? ""} ${cat}`.toLowerCase().includes(q);
    });
  }, [items, q, catNames]);

  const grid = (list: Item[]) => (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
      {list.map((item) => (
        // Plain wrapper carries the deep-link anchor id (guaranteed in the DOM) + scroll offset
        // for the sticky header — see order lines linking to /shop/[id]#item-<id>.
        <div key={item.id} id={`item-${item.id}`} style={{ scrollMarginTop: 84 }}>
          <AddItemCard
            item={item}
            shopId={shopId}
            shopName={shopName}
            shopOpen={shopOpen}
            shopDeliveryFee={shopDeliveryFee}
            shopLat={shopLat}
            shopLng={shopLng}
          />
        </div>
      ))}
    </SimpleGrid>
  );

  // Build ordered, non-empty category sections from the filtered items.
  const known = new Set(categories.map((c) => c.id));
  const sections = [...categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({
      id: c.id,
      name: c.name,
      items: filtered.filter((i) => i.category_id === c.id),
    }))
    .filter((s) => s.items.length > 0);

  if (sections.length > 0) {
    const uncategorized = filtered.filter((i) => !i.category_id || !known.has(i.category_id));
    if (uncategorized.length > 0) {
      sections.push({ id: "__other", name: "Altele", items: uncategorized });
    }
  }

  return (
    <div>
      <TextInput
        placeholder={`Caută în catalogul ${shopName}…`}
        leftSection={<Search size={16} />}
        rightSection={
          query ? (
            <ActionIcon variant="subtle" color="gray" onClick={() => setQuery("")} aria-label="Șterge căutarea">
              <X size={14} />
            </ActionIcon>
          ) : null
        }
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        maw={440}
        mb="lg"
      />

      {filtered.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          {q ? `Niciun rezultat pentru „${query}".` : "Catalogul este gol."}
        </Text>
      ) : sections.length === 0 ? (
        grid(filtered)
      ) : (
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
      )}
    </div>
  );
}
