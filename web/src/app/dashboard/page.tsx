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
import { RevenueBars } from "@/components/dashboard/RevenueBars";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { ExportReportButton } from "@/components/dashboard/ExportReportButton";
import { ShopOrderQueue } from "@/components/dashboard/ShopOrderQueue";

export const metadata: Metadata = { title: "Dashboard magazin" };

const REVENUE = [
  { label: "L", value: 620 },
  { label: "Ma", value: 880 },
  { label: "Mi", value: 540 },
  { label: "J", value: 1120 },
  { label: "V", value: 1320 },
  { label: "S", value: 980 },
  { label: "D", value: 1240 },
];

const TOP = [
  { name: "Listare licență", orders: 42, revenue: 3150 },
  { name: "Legare termică", orders: 28, revenue: 700 },
  { name: "Printare A3 color", orders: 19, revenue: 855 },
  { name: "Caiet A4 80 file", orders: 64, revenue: 954 },
];

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
          <ExportReportButton />
          <Button leftSection={<Plus size={16} />}>Adaugă produs</Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
        <StatCard
          icon={<Clock size={20} />}
          value={String(newCount)}
          label="Comenzi noi"
          delta="+2 vs ieri"
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
        {/* TODO(BE): revenue aggregation not computed yet — visual placeholder. */}
        <StatCard
          icon={<TrendingUp size={20} />}
          value="1.240 lei"
          label="Venit azi"
          delta="+24%"
          color="brand"
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Card>
          <Group justify="space-between">
            <Text fw={700}>Venit — ultimele 7 zile</Text>
            <Text fw={800} fz={20} c="var(--mantine-color-text)">
              8.420 lei
            </Text>
          </Group>
          <RevenueBars data={REVENUE} />
        </Card>
        <Card>
          <Text fw={700} mb="md">
            Top servicii
          </Text>
          <Stack gap="sm">
            {TOP.map((t) => (
              <Group key={t.name} justify="space-between">
                <div>
                  <Text fz="sm" fw={600}>
                    {t.name}
                  </Text>
                  <Text fz="xs" c="dimmed">
                    {roCount(t.orders, "comandă", "comenzi")}
                  </Text>
                </div>
                <Text fw={700} fz="sm">
                  {t.revenue} lei
                </Text>
              </Group>
            ))}
          </Stack>
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
