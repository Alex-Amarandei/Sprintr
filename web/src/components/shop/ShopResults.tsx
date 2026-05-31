"use client";

import { Box, Group, SimpleGrid, Text, Title } from "@mantine/core";
import { Search } from "lucide-react";
import type { SampleShop } from "@/lib/catalog/samples";
import { useSearch } from "@/components/search/SearchContext";
import { ShopCard } from "@/components/shop/ShopCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { roCount } from "@/lib/utils/format";

/** Client-side, debounced search over the shop list (name / description / address / tags). */
export function ShopResults({
  shops,
  favoriteIds,
}: {
  shops: SampleShop[];
  /** Favourited shop ids, or null when signed out (→ hide hearts). */
  favoriteIds?: string[] | null;
}) {
  const { query } = useSearch();
  const q = query.trim().toLowerCase();
  const favSet = favoriteIds ? new Set(favoriteIds) : null;

  const filtered = q
    ? shops.filter((s) =>
        [s.name, s.description, s.address, s.category, ...(s.tags ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : shops;

  return (
    <Box>
      <Group justify="space-between" align="baseline" mb="md">
        <Title order={3}>{q ? "Rezultate căutare" : "Magazine în Iași"}</Title>
        <Text fz="sm" c="dimmed">
          {roCount(filtered.length, "magazin", "magazine")}
        </Text>
      </Group>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={26} />}
          title="Niciun magazin găsit"
          description={`Nu am găsit magazine pentru „${query.trim()}”. Încearcă alt termen.`}
        />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
          {filtered.map((shop) => (
            <ShopCard
              key={shop.id}
              shop={shop}
              showFavorite={favSet !== null}
              favorited={favSet?.has(shop.id) ?? false}
            />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
