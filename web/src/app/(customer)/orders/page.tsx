import { Metadata } from "next";
import { Group, SimpleGrid, Stack, Title } from "@mantine/core";
import { Check, Clock, Percent, Plus, Wallet } from "lucide-react";
import { getCustomerStats, getMyOrders } from "@/lib/orders/queries";
import { StatCard } from "@/components/ui/StatCard";
import { OrdersTable } from "@/components/order/OrdersTable";
import { LinkButton } from "@/components/ui/links";
import { isCompletedStatus, isTerminalStatus } from "@/lib/design/status";

export const metadata: Metadata = { title: "Comenzile mele" };

export default async function CustomerOrdersPage() {
  const [orders, stats] = await Promise.all([getMyOrders(), getCustomerStats()]);
  const active = orders.filter((o) => !isTerminalStatus(o.status)).length;
  const done = orders.filter((o) => isCompletedStatus(o.status)).length;

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
        <StatCard icon={<Percent size={20} />} value={`${stats.totalSaved.toFixed(0)} RON`} label="Economisit cu promoții" color="cyan" />
        <StatCard icon={<Wallet size={20} />} value={`${stats.totalSpent.toFixed(0)} RON`} label="Total cheltuit" color="mist" />
      </SimpleGrid>

      <OrdersTable orders={orders} />
    </Stack>
  );
}
