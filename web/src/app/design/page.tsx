import {
  Box,
  Button,
  Card,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  Check,
  Clock,
  Package,
  Printer,
  Search,
  TrendingUp,
  X,
  ShoppingBag,
} from "lucide-react";
import { Metadata } from "next";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OpenBadge } from "@/components/ui/OpenBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import type { OrderStatus } from "@/lib/design/status";

export const metadata: Metadata = { title: "Design system" };

const RAMPS = ["brand", "slate", "ink", "teal", "cyan", "mist", "stone"] as const;
const RAMP_LABEL: Record<(typeof RAMPS)[number], string> = {
  brand: "Brand · Ember",
  slate: "Slate",
  ink: "Ink",
  teal: "Teal",
  cyan: "Cyan",
  mist: "Mist",
  stone: "Stone",
};
const STATUSES: OrderStatus[] = [
  "pending",
  "accepted",
  "in_progress",
  "done",
  "rejected",
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper withBorder radius="lg" p="xl">
      <Text tt="uppercase" fw={700} fz="xs" c="brand.6" mb="lg" style={{ letterSpacing: 0.6 }}>
        {title}
      </Text>
      {children}
    </Paper>
  );
}

export default function DesignSystemPage() {
  return (
    <Box mih="100vh" bg="gray.0">
      <Container size="lg" py="xl">
        <Stack gap="xl">
          <SectionHeader
            eyebrow="Design system v2"
            title="Slate · Ink · Ember"
            subtitle="Paletă cool-blue cu ember vibrant pentru CTA și status. Construit 100% pe Mantine."
          />

          {/* Palette */}
          <Block title="Paletă completă — 7 ramps">
            <Stack gap="lg">
              {RAMPS.map((name) => (
                <div key={name}>
                  <Text fw={600} fz="sm" mb={6}>
                    {RAMP_LABEL[name]}
                  </Text>
                  <Group gap={6}>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Stack key={i} gap={4} align="center">
                        <Box
                          w={52}
                          h={44}
                          bg={`${name}.${i}`}
                          style={{
                            borderRadius: 8,
                            border: "1px solid var(--mantine-color-gray-2)",
                          }}
                        />
                        <Text fz={10} c="dimmed">
                          {i}
                        </Text>
                      </Stack>
                    ))}
                  </Group>
                </div>
              ))}
            </Stack>
          </Block>

          {/* Buttons */}
          <Block title="Butoane">
            <Group>
              <Button leftSection={<TrendingUp size={16} />}>Comandă</Button>
              <Button color="ink">Acceptă</Button>
              <Button variant="filled" color="stone.1">
                Anulează
              </Button>
              <Button variant="light">Light</Button>
              <Button variant="subtle" color="gray">
                Subtle
              </Button>
              <Button color="teal" leftSection={<Check size={16} />}>
                Acceptă
              </Button>
              <Button color="red" leftSection={<X size={16} />}>
                Respinge
              </Button>
            </Group>
          </Block>

          {/* Status & badges */}
          <Block title="Status comenzi & indicatori">
            <Group>
              {STATUSES.map((s) => (
                <StatusBadge key={s} status={s} />
              ))}
              <OpenBadge open />
              <OpenBadge open={false} />
            </Group>
          </Block>

          {/* Stat cards */}
          <Block title="KPI cards">
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
              <StatCard icon={<Clock size={20} />} value="4" label="Comenzi noi" delta="+2 vs ieri" color="brand" />
              <StatCard icon={<Package size={20} />} value="6" label="În pregătire" color="cyan" />
              <StatCard icon={<Check size={20} />} value="18" label="Finalizate azi" delta="+12%" color="teal" />
              <StatCard icon={<TrendingUp size={20} />} value="1.240 lei" label="Venit azi" delta="+24%" color="brand" />
            </SimpleGrid>
          </Block>

          {/* Surfaces & controls */}
          <Block title="Suprafețe & controale">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <Card>
                <Group justify="space-between" mb="xs">
                  <Group gap="sm">
                    <ThemeIcon variant="light" color="slate" size={40} radius="md">
                      <Printer size={20} />
                    </ThemeIcon>
                    <div>
                      <Text fw={600}>Print Express Copou</Text>
                      <Text fz="sm" c="dimmed">
                        Lângă universitate
                      </Text>
                    </div>
                  </Group>
                  <OpenBadge open />
                </Group>
                <Group gap="xs" mt="sm">
                  <TextInput
                    flex={1}
                    placeholder="Caută magazine..."
                    leftSection={<Search size={16} />}
                  />
                </Group>
                <Switch label="Magazin deschis" defaultChecked mt="md" />
              </Card>

              {/* Gradient banner (inline style, on-palette) */}
              <Paper
                radius="lg"
                p="xl"
                style={{
                  background:
                    "linear-gradient(135deg, var(--mantine-color-slate-8), var(--mantine-color-brand-6))",
                }}
              >
                <Text tt="uppercase" fz="xs" fw={700} c="brand.1" style={{ letterSpacing: 0.6 }}>
                  Săptămâna studentului
                </Text>
                <Title order={3} c="white" mt="xs">
                  10% reducere la lucrări de licență
                </Title>
                <Text c="gray.3" fz="sm" mt="xs">
                  Cu codul STUDENT10, valid până duminică
                </Text>
              </Paper>
            </SimpleGrid>
          </Block>

          {/* Empty state */}
          <Block title="Empty state">
            <EmptyState
              icon={<ShoppingBag size={26} />}
              title="Nicio comandă încă"
              description="Comenzile tale vor apărea aici după prima plasare."
              action={<Button mt="sm">Comandă acum</Button>}
            />
          </Block>
        </Stack>
      </Container>
    </Box>
  );
}
