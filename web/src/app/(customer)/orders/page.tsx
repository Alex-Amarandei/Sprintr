import { Metadata } from "next";
import { Group, SimpleGrid, Stack, Title } from "@mantine/core";
import { Check, Clock, Percent, Plus, Zap } from "lucide-react";
import { getMyOrders } from "@/lib/orders/queries";
import { StatCard } from "@/components/ui/StatCard";
import { OrdersTable } from "@/components/order/OrdersTable";
import { LinkButton } from "@/components/ui/links";

export const metadata: Metadata = { title: "Comenzile mele" };

export default async function CustomerOrdersPage() {
  const orders = await getMyOrders();
  const active = orders.filter((o) =>
    ["pending", "accepted", "in_progress"].includes(o.status)
  ).length;
  const done = orders.filter((o) => o.status === "done").length;

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Comenzile mele</Title>
        </div>
        <LinkButton href="/browse" leftSection={<Plus size={18} />}>
          Comandă nouă
        </LinkButton>
      </Group>

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
        <StatCard icon={<Clock size={20} />} value={String(active)} label="Active acum" color="brand" />
        <StatCard icon={<Check size={20} />} value={String(done)} label="Finalizate" color="teal" />
        {/* TODO(BE): promo savings + avg delivery not tracked yet — visual placeholders. */}
        <StatCard icon={<Percent size={20} />} value="48 lei" label="Economisit cu promoții" color="cyan" />
        <StatCard icon={<Zap size={20} />} value="28 min" label="Livrare medie" color="mist" />
      </SimpleGrid>

      <OrdersTable orders={orders} />
    </Stack>
  );
}
