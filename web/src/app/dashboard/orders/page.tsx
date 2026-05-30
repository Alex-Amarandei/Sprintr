import { Metadata } from "next";
import { Stack, Text, Title } from "@mantine/core";
import { sampleOrders } from "@/lib/orders/sample";
import { ShopOrderQueue } from "@/components/dashboard/ShopOrderQueue";

export const metadata: Metadata = { title: "Comenzi primite" };

export default function ShopOrdersPage() {
  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Comenzi</Title>
        <Text c="dimmed">
          Acceptă, respinge și avansează statusul comenzilor primite.
        </Text>
      </div>
      {/* TODO(BE): replace sampleOrders with this shop's orders from Supabase. */}
      <ShopOrderQueue initialOrders={sampleOrders} />
    </Stack>
  );
}
