import { Metadata } from "next";
import {
  Box,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Copy, Layers, PenTool, Printer, Upload, Zap } from "lucide-react";
import { sampleShops } from "@/lib/catalog/samples";
import { createClient } from "@/lib/supabase/server";
import { ShopCard } from "@/components/shop/ShopCard";
import { LinkButton } from "@/components/ui/links";

export const metadata: Metadata = { title: "Magazine" };

// Visual filter chips (filtering not wired yet — TODO once BE shop reads land).
const FILTERS = [
  { label: "Toate", icon: null },
  { label: "Printare", icon: Printer },
  { label: "Copiere", icon: Copy },
  { label: "Legare", icon: Layers },
  { label: "Birotică", icon: PenTool },
  { label: "Rapid (sub 30 min)", icon: Zap },
] as const;

export default async function BrowsePage() {
  // Greeting personalisation (browse is public → user may be null).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let firstName = "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    firstName = profile?.full_name?.split(" ")[0] ?? "";
  }

  const openCount = sampleShops.filter((s) => s.isOpen ?? true).length;

  return (
    <Stack gap="xl">
      {/* Welcome band */}
      <Paper
        radius="lg"
        p="xl"
        style={{
          background:
            "linear-gradient(120deg, var(--mantine-color-ink-9), var(--mantine-color-slate-7))",
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <div>
            <Title order={2} c="white">
              Bună{firstName ? `, ${firstName}` : ""} 👋
            </Title>
            <Text c="gray.4" mt={4}>
              {openCount} magazine sunt deschise acum în Iași. De unde comanzi azi?
            </Text>
          </div>
          <LinkButton
            href={`/shop/${sampleShops[0].id}`}
            size="md"
            leftSection={<Upload size={18} />}
          >
            Încarcă PDF & comandă rapid
          </LinkButton>
        </Group>
      </Paper>

      {/* Filters (visual) */}
      <Group gap="sm">
        {FILTERS.map(({ label, icon: Icon }, i) => (
          <Button
            key={label}
            size="xs"
            radius="xl"
            variant={i === 0 ? "filled" : "default"}
            color={i === 0 ? "ink" : undefined}
            leftSection={Icon ? <Icon size={14} /> : undefined}
          >
            {label}
          </Button>
        ))}
      </Group>

      {/* Shop grid */}
      <Box>
        <Group justify="space-between" align="baseline" mb="md">
          <Title order={3}>Magazine în Iași</Title>
          <Text fz="sm" c="dimmed">
            {sampleShops.length} magazine
          </Text>
        </Group>
        {/* TODO(BE): replace sampleShops with shops read from Supabase */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
          {sampleShops.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </SimpleGrid>
      </Box>
    </Stack>
  );
}
