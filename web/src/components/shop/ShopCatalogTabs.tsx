"use client";

import { SimpleGrid, Tabs } from "@mantine/core";
import type { Item } from "@/lib/catalog/schema";
import { AddItemCard } from "@/components/cart/AddItemCard";

/**
 * Client wrapper for the shop catalog tabs. Mantine's compound `Tabs.*` API can't be
 * accessed from a Server Component (the sub-components resolve to undefined), so the
 * tabbed catalog lives here.
 */
export function ShopCatalogTabs({
  items,
  shopId,
}: {
  items: Item[];
  shopId: string;
}) {
  const services = items.filter((i) => i.kind === "service");
  const products = items.filter((i) => i.kind === "product");

  const grid = (list: Item[]) => (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" mt="lg">
      {list.map((item) => (
        <AddItemCard key={item.id} item={item} shopId={shopId} />
      ))}
    </SimpleGrid>
  );

  return (
    <Tabs defaultValue="all" color="brand">
      <Tabs.List>
        <Tabs.Tab value="all">Toate ({items.length})</Tabs.Tab>
        <Tabs.Tab value="service">Servicii ({services.length})</Tabs.Tab>
        <Tabs.Tab value="product">Produse ({products.length})</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="all">{grid(items)}</Tabs.Panel>
      <Tabs.Panel value="service">{grid(services)}</Tabs.Panel>
      <Tabs.Panel value="product">{grid(products)}</Tabs.Panel>
    </Tabs>
  );
}
