import { Metadata } from "next";
import {
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Check, Clock, Package, Plus, TrendingUp } from "lucide-react";
import { getMyShop, getShopOrders } from "@/lib/orders/queries";
import { roCount } from "@/lib/utils/format";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { ExportReportButton } from "@/components/dashboard/ExportReportButton";
import { ShopOrderQueue } from "@/components/dashboard/ShopOrderQueue";

export const metadata: Metadata = { title: "Dashboard magazin" };

export default async function ShopDashboardPage() {
  const [shop, orders] = await Promise.all([getMyShop(), getShopOrders()]);
  const today = new Intl.DateTimeFormat("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const newCount = orders.filter((o) => o.status === "pending").length;
  const prepCount = orders.filter(
    (o) => o.status === "accepted" || o.status === "in_progress",
  ).length;
  const doneCount = orders.filter((o) => o.status === "done").length;
  const doneRevenue = orders
    .filter((o) => o.status === "done")
    .reduce((sum, o) => sum + o.total, 0);

  // Top services by revenue — aggregated from real order line items.
  const byTitle = new Map<string, { revenue: number; count: number }>();
  for (const o of orders) {
    for (const l of o.lines) {
      const cur = byTitle.get(l.title) ?? { revenue: 0, count: 0 };
      byTitle.set(l.title, { revenue: cur.revenue + l.lineTotal, count: cur.count + 1 });
    }
  }
  const topServices = [...byTitle.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 4);

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
        <div>
          <Text fz="sm" c="dimmed" tt="capitalize">
            {today}
          </Text>
          <DashboardGreeting name={shop?.name ?? "magazin"} />
          <Text c="dimmed">
            Ai {roCount(newCount, "comandă nouă", "comenzi noi")} care așteaptă aprobare.
          </Text>
        </div>
        <Group>
          <ExportReportButton orders={orders} />
          <Button leftSection={<Plus size={16} />}>Adaugă produs</Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
        <StatCard
          icon={<Clock size={20} />}
          value={String(newCount)}
          label="Comenzi noi"
          color="brand"
        />
        <StatCard
          icon={<Package size={20} />}
          value={String(prepCount)}
          label="În pregătire"
          color="cyan"
        />
        <StatCard
          icon={<Check size={20} />}
          value={String(doneCount)}
          label="Finalizate"
          color="teal"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          value={`${doneRevenue.toFixed(0)} lei`}
          label="Venit finalizat"
          color="brand"
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Card>
          <Text fw={700} mb="md">
            Venit — ultimele 7 zile
          </Text>
          <Text c="dimmed" fz="sm" ta="center" py="xl">
            Graficul de venit pe zile apare aici odată ce avem istoric de comenzi.
          </Text>
        </Card>
        <Card>
          <Text fw={700} mb="md">
            Top servicii
          </Text>
          {topServices.length === 0 ? (
            <Text c="dimmed" fz="sm" ta="center" py="xl">
              Nicio comandă încă.
            </Text>
          ) : (
            <Stack gap="sm">
              {topServices.map((t) => (
                <Group key={t.name} justify="space-between">
                  <div>
                    <Text fz="sm" fw={600}>
                      {t.name}
                    </Text>
                    <Text fz="xs" c="dimmed">
                      {roCount(t.count, "comandă", "comenzi")}
                    </Text>
                  </div>
                  <Text fw={700} fz="sm">
                    {t.revenue.toFixed(0)} lei
                  </Text>
                </Group>
              ))}
            </Stack>
          )}
        </Card>
      </SimpleGrid>

      <div>
        <Title order={3} mb="md">
          Comenzi
        </Title>
        <ShopOrderQueue initialOrders={orders} limit={5} />
      </div>
    </Stack>
  );
}
