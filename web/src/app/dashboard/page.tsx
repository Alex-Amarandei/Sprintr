import { Metadata } from "next";
import {
  Badge,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { Check, Clock, Package, Plus, Star, TrendingUp } from "lucide-react";
import {
  getMyShop,
  getShopOrders,
  getShopRevenueDaily,
  getShopStats,
  getShopTopItems,
} from "@/lib/orders/queries";
import { roCount } from "@/lib/utils/format";
import { LinkButton } from "@/components/ui/links";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { ExportReportButton } from "@/components/dashboard/ExportReportButton";
import { ShopOrderQueue } from "@/components/dashboard/ShopOrderQueue";

export const metadata: Metadata = { title: "Dashboard magazin" };

export default async function ShopDashboardPage() {
  const shop = await getMyShop();
  const [orders, revenueDaily, stats, topItems] = await Promise.all([
    getShopOrders(),
    shop ? getShopRevenueDaily(shop.id) : Promise.resolve([]),
    shop ? getShopStats(shop.id) : Promise.resolve(null),
    shop ? getShopTopItems(shop.id, 5) : Promise.resolve([]),
  ]);
  const maxRevenue = Math.max(...revenueDaily.map((d) => d.revenue), 1);
  const dayLabel = (iso: string) =>
    new Intl.DateTimeFormat("ro-RO", { weekday: "short" }).format(new Date(iso));
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

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
        <div>
          <Text fz="sm" c="dimmed" tt="capitalize">
            {today}
          </Text>
          <DashboardGreeting name={shop?.name ?? "magazin"} />
          <Group gap="sm">
            <Text c="dimmed">
              Ai {roCount(newCount, "comandă nouă", "comenzi noi")} care așteaptă aprobare.
            </Text>
            {stats && stats.reviewsCount > 0 && (
              <Group gap={4} c="dimmed">
                <Star size={14} fill="var(--mantine-color-yellow-5)" color="var(--mantine-color-yellow-5)" />
                <Text fz="sm">
                  {stats.avgRating.toFixed(1)} · {roCount(stats.reviewsCount, "recenzie", "recenzii")}
                </Text>
              </Group>
            )}
          </Group>
        </div>
        <Group>
          <ExportReportButton />
          <LinkButton href="/dashboard/products" leftSection={<Plus size={16} />}>
            Adaugă produs
          </LinkButton>
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
          value={`${doneRevenue.toFixed(2)} lei`}
          label="Venit finalizat"
          color="brand"
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Card>
          <Group justify="space-between" mb="md">
            <Text fw={700}>Venit — ultimele 7 zile</Text>
            {stats && (
              <Text fz="xs" c="dimmed">
                Total: {stats.revenueTotal.toFixed(2)} lei
              </Text>
            )}
          </Group>
          {revenueDaily.every((d) => d.revenue === 0) ? (
            <Text c="dimmed" fz="sm" ta="center" py="xl">
              Niciun venit în ultimele 7 zile.
            </Text>
          ) : (
            <Group align="flex-end" gap="xs" grow h={150} pt="md">
              {revenueDaily.map((d) => (
                <Stack key={d.day} gap={4} align="center" justify="flex-end" h="100%">
                  <Text fz={9} c="dimmed">
                    {d.revenue > 0 ? d.revenue.toFixed(0) : ""}
                  </Text>
                  <Tooltip label={`${d.revenue.toFixed(2)} lei`} withArrow>
                    <div
                      style={{
                        width: "100%",
                        height: `${Math.round((d.revenue / maxRevenue) * 100)}%`,
                        minHeight: d.revenue > 0 ? 4 : 0,
                        background: "var(--mantine-color-brand-6)",
                        borderRadius: 4,
                      }}
                    />
                  </Tooltip>
                  <Text fz={9} c="dimmed" tt="capitalize">
                    {dayLabel(d.day)}
                  </Text>
                </Stack>
              ))}
            </Group>
          )}
        </Card>
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
              {topItems.map((t) => (
                <Group key={t.itemId} justify="space-between" wrap="nowrap" align="flex-start">
                  <div style={{ minWidth: 0 }}>
                    <Group gap={6} wrap="nowrap">
                      <Text fz="sm" fw={600} truncate>
                        {t.title}
                      </Text>
                      <Badge
                        size="xs"
                        variant="light"
                        color={t.kind === "service" ? "brand" : "blue"}
                      >
                        {t.kind === "service" ? "Serviciu" : "Produs"}
                      </Badge>
                    </Group>
                    <Text fz="xs" c="dimmed">
                      {roCount(t.qty, "bucată vândută", "bucăți vândute")} ·{" "}
                      {roCount(t.orders, "comandă", "comenzi")}
                      {t.avgRating > 0 ? ` · ★ ${t.avgRating.toFixed(1)}` : ""}
                    </Text>
                  </div>
                  <Text fw={700} fz="sm" style={{ whiteSpace: "nowrap" }}>
                    {t.revenue.toFixed(2)} lei
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
