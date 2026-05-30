import { Metadata } from "next";
import { Paper, SimpleGrid, Text, Title } from "@mantine/core";

export const metadata: Metadata = { title: "Dashboard magazin" };

const stats = [
  { label: "Comenzi noi", value: "0", color: "orange" },
  { label: "În procesare", value: "0", color: "blue" },
  { label: "Finalizate azi", value: "0", color: "green" },
  { label: "Venituri azi", value: "0 RON", color: "grape" },
];

export default function ShopDashboardPage() {
  return (
    <div>
      <Title order={2} mb="xl">
        Dashboard
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        {stats.map(({ label, value, color }) => (
          <Paper key={label} withBorder radius="lg" p="lg">
            <Text size="sm" c="dimmed" mb="xs">
              {label}
            </Text>
            <Text fz={28} fw={700} c={`${color}.7`}>
              {value}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>
      {/* TODO: recent orders table */}
    </div>
  );
}
