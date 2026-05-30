import { Metadata } from "next";
import { Stack, Text, Title } from "@mantine/core";
import { getShopOrders } from "@/lib/orders/queries";
import { ShopOrderQueue } from "@/components/dashboard/ShopOrderQueue";

export const metadata: Metadata = { title: "Comenzi primite" };

export default async function ShopOrdersPage() {
  const orders = await getShopOrders();
  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Comenzi</Title>
        <Text c="dimmed">
          Acceptă, respinge și avansează statusul comenzilor primite.
        </Text>
      </div>
      <ShopOrderQueue initialOrders={orders} />
    </Stack>
  );
}
