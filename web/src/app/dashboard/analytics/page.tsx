import { Metadata } from "next";
import { Badge, Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { BarChart3, Percent, ShoppingBag, Star, TrendingUp, Wallet } from "lucide-react";
import { RevenueAreaChart, StatusDonut } from "@/components/dashboard/AnalyticsCharts";
import {
  getMyShop,
  getShopRevenueDaily,
  getShopStats,
  getShopStatusCounts,
  getShopTopItems,
} from "@/lib/orders/queries";
import { ORDER_STATUS, type OrderStatus } from "@/lib/design/status";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { roCount } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Statistici" };

const lei = (n: number) => `${n.toFixed(2)} lei`;

export default async function AnalyticsPage() {
  const shop = await getMyShop();
  if (!shop) {
    return (
      <Stack gap="lg">
        <Title order={2}>Statistici</Title>
        <EmptyState
          icon={<BarChart3 size={26} />}
          title="Niciun magazin asociat"
          description="Contul tău nu este asociat unui magazin."
        />
      </Stack>
    );
  }

  const [stats, daily, statusCounts, topItems] = await Promise.all([
    getShopStats(shop.id),
    getShopRevenueDaily(shop.id, 30),
    getShopStatusCounts(shop.id),
    getShopTopItems(shop.id, 8),
  ]);

  const aov = stats && stats.done > 0 ? stats.revenueTotal / stats.done : 0;

  const revenueData = daily.map((d) => ({
    date: new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short" }).format(
      new Date(d.day),
    ),
    Venit: d.revenue,
  }));

  const donutData = statusCounts
    .filter((s) => s.count > 0)
    .map((s) => ({
      name: ORDER_STATUS[s.status as OrderStatus]?.label ?? s.status,
      value: s.count,
      colorKey: ORDER_STATUS[s.status as OrderStatus]?.color ?? "gray",
    }));

  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Statistici</Title>
        <Text c="dimmed">{shop.name}</Text>
      </div>

      <SimpleGrid cols={{ base: 2, md: 3, lg: 6 }} spacing="lg">
        <StatCard icon={<TrendingUp size={20} />} value={lei(stats?.revenueTotal ?? 0)} label="Venit total" color="brand" />
        <StatCard icon={<Wallet size={20} />} value={lei(stats?.payoutTotal ?? 0)} label="Încasări" color="teal" />
        <StatCard icon={<Percent size={20} />} value={lei(stats?.commissionTotal ?? 0)} label="Comision platformă" color="grape" />
        <StatCard icon={<ShoppingBag size={20} />} value={String(stats?.done ?? 0)} label="Comenzi finalizate" color="cyan" />
        <StatCard icon={<TrendingUp size={20} />} value={lei(aov)} label="Valoare medie comandă" color="mist" />
        <StatCard
          icon={<Star size={20} />}
          value={stats && stats.reviewsCount > 0 ? stats.avgRating.toFixed(1) : "—"}
          label={`Rating (${roCount(stats?.reviewsCount ?? 0, "recenzie", "recenzii")})`}
          color="yellow"
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Card>
          <Text fw={700} mb="md">
            Venit — ultimele 30 de zile
          </Text>
          {revenueData.every((d) => d.Venit === 0) ? (
            <Text c="dimmed" fz="sm" ta="center" py="xl">
              Niciun venit în această perioadă.
            </Text>
          ) : (
            <RevenueAreaChart data={revenueData} />
          )}
        </Card>

        <Card>
          <Text fw={700} mb="md">
            Comenzi după status
          </Text>
          {donutData.length === 0 ? (
            <Text c="dimmed" fz="sm" ta="center" py="xl">
              Nicio comandă încă.
            </Text>
          ) : (
            <Group justify="center" py="md">
              <StatusDonut data={donutData} label={String(stats?.ordersTotal ?? 0)} />
            </Group>
          )}
        </Card>
      </SimpleGrid>

      <Card>
        <Text fw={700} mb="md">
          Top vânzări
        </Text>
        {topItems.length === 0 ? (
          <Text c="dimmed" fz="sm" ta="center" py="xl">
            Nicio comandă încă.
          </Text>
        ) : (
          <Stack gap="sm">
            {topItems.map((t, i) => (
              <Group key={t.itemId} justify="space-between" wrap="nowrap" align="flex-start">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <Text fz="sm" c="dimmed" w={20}>
                    {i + 1}.
                  </Text>
                  <div style={{ minWidth: 0 }}>
                    <Group gap={6} wrap="nowrap">
                      <Text fz="sm" fw={600} truncate>
                        {t.title}
                      </Text>
                      <Badge size="xs" variant="light" color={t.kind === "service" ? "brand" : "blue"}>
                        {t.kind === "service" ? "Serviciu" : "Produs"}
                      </Badge>
                    </Group>
                    <Text fz="xs" c="dimmed">
                      {roCount(t.qty, "bucată vândută", "bucăți vândute")} ·{" "}
                      {roCount(t.orders, "comandă", "comenzi")}
                      {t.avgRating > 0 ? ` · ★ ${t.avgRating.toFixed(1)}` : ""}
                    </Text>
                  </div>
                </Group>
                <Text fw={700} fz="sm" style={{ whiteSpace: "nowrap" }}>
                  {lei(t.revenue)}
                </Text>
              </Group>
            ))}
          </Stack>
        )}
      </Card>
    </Stack>
  );
}
