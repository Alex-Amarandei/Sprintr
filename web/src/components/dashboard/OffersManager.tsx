"use client";

import { useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { MoreHorizontal, Palette, Plus } from "lucide-react";

type PromoType = "percent" | "fixed" | "bxgy";

interface Promo {
  id: string;
  type: PromoType;
  typeLabel: string;
  title: string;
  code: string;
  window: string;
  active: boolean;
}

const TYPE_COLOR: Record<PromoType, string> = {
  percent: "brand",
  fixed: "teal",
  bxgy: "cyan",
};

const INITIAL_PROMOS: Promo[] = [
  { id: "1", type: "percent", typeLabel: "Procent", title: "10% reducere licență", code: "STUDENT10", window: "01–07 Dec", active: true },
  { id: "2", type: "fixed", typeLabel: "Sumă fixă", title: "Livrare gratuită peste 80 lei", code: "LIVRARE0", window: "Permanent", active: true },
  { id: "3", type: "bxgy", typeLabel: "Cumpără X, primești Y", title: "La 2 pixuri, al 3-lea gratuit", code: "2PLUS1", window: "Permanent", active: false },
  { id: "4", type: "percent", typeLabel: "Procent", title: "25% reducere toate produsele", code: "BLACKFRI25", window: "Expirat 29 Nov", active: false },
];

export function OffersManager() {
  const [banner, setBanner] = useState({
    eyebrow: "Săptămâna studentului",
    code: "STUDENT10",
    title: "10% reducere la lucrări de licență",
    description: "Cu codul STUDENT10, valid până duminică",
    active: true,
  });
  const [promos, setPromos] = useState<Promo[]>(INITIAL_PROMOS);

  const set = (k: keyof typeof banner, v: string | boolean) =>
    setBanner((b) => ({ ...b, [k]: v }));

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Oferte & promoții</Title>
          <Text c="dimmed">
            Atrage clienți noi cu promoții și un banner activ pe pagina ta.
          </Text>
        </div>
        <Button leftSection={<Plus size={16} />}>Promoție nouă</Button>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {/* Banner editor */}
        <Card>
          <Group justify="space-between" mb="md">
            <Text fw={700}>Banner principal</Text>
            <Text fz="xs" c="dimmed">
              Apare în vârful paginii magazinului
            </Text>
          </Group>

          {/* Live preview */}
          <Paper
            radius="md"
            p="lg"
            mb="md"
            style={{
              background:
                "linear-gradient(120deg, var(--mantine-color-ink-9), var(--mantine-color-brand-6))",
            }}
          >
            <Text tt="uppercase" fz={10} fw={700} c="brand.1" style={{ letterSpacing: 0.6 }}>
              {banner.eyebrow || "Eyebrow"}
            </Text>
            <Title order={3} c="white" mt={4}>
              {banner.title || "Titlu promoție"}
            </Title>
            <Text c="gray.3" fz="sm" mt={4}>
              {banner.description || "Descriere"}
            </Text>
          </Paper>

          <Stack gap="sm">
            <SimpleGrid cols={2} spacing="sm">
              <TextInput
                label="Eyebrow"
                value={banner.eyebrow}
                onChange={(e) => set("eyebrow", e.currentTarget.value)}
              />
              <TextInput
                label="Cod"
                value={banner.code}
                onChange={(e) => set("code", e.currentTarget.value)}
              />
            </SimpleGrid>
            <TextInput
              label="Titlu"
              value={banner.title}
              onChange={(e) => set("title", e.currentTarget.value)}
            />
            <Textarea
              label="Descriere"
              autosize
              minRows={2}
              value={banner.description}
              onChange={(e) => set("description", e.currentTarget.value)}
            />
            <Group justify="space-between" mt="xs">
              <Switch
                label="Banner activ"
                checked={banner.active}
                onChange={(e) => set("active", e.currentTarget.checked)}
              />
              <Button variant="default" leftSection={<Palette size={16} />}>
                Schimbă culori
              </Button>
            </Group>
          </Stack>
        </Card>

        {/* Promotions list */}
        <Card>
          <Text fw={700} mb="md">
            Promoții active ({promos.filter((p) => p.active).length})
          </Text>
          <Stack gap="sm">
            {promos.map((p) => (
              <Paper key={p.id} withBorder radius="md" p="sm">
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                  <div style={{ minWidth: 0 }}>
                    <Group gap={6} mb={4}>
                      <Badge variant="light" color={TYPE_COLOR[p.type]} size="sm">
                        {p.typeLabel}
                      </Badge>
                      <Badge variant="light" color={p.active ? "teal" : "mist"} size="sm">
                        {p.active ? "Activă" : "Inactivă"}
                      </Badge>
                      <Badge variant="outline" color="brand" size="sm">
                        {p.code}
                      </Badge>
                    </Group>
                    <Text fw={600} fz="sm">
                      {p.title}
                    </Text>
                    <Text fz="xs" c="dimmed">
                      {p.window}
                    </Text>
                  </div>
                  <Group gap={4} wrap="nowrap">
                    <Switch
                      checked={p.active}
                      onChange={() =>
                        setPromos((prev) =>
                          prev.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x))
                        )
                      }
                    />
                    <ActionIcon variant="subtle" color="gray" aria-label="Opțiuni">
                      <MoreHorizontal size={18} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}
