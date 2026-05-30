"use client";

import { useState, useTransition } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { Check, Circle, Image as ImageIcon, Printer } from "lucide-react";
import { toast } from "sonner";
import { updateShopProfile } from "@/lib/shop/actions";
import type { ShopProfileInput } from "@/lib/shop/types";

interface Day {
  label: string;
  open: boolean;
  from: string;
  to: string;
}

const INITIAL_DAYS: Day[] = [
  { label: "Luni", open: true, from: "08:00", to: "20:00" },
  { label: "Marți", open: true, from: "08:00", to: "20:00" },
  { label: "Miercuri", open: true, from: "08:00", to: "20:00" },
  { label: "Joi", open: true, from: "08:00", to: "20:00" },
  { label: "Vineri", open: true, from: "08:00", to: "20:00" },
  { label: "Sâmbătă", open: true, from: "09:00", to: "17:00" },
  { label: "Duminică", open: false, from: "", to: "" },
];

const CHECKLIST = [
  { label: "Logo & banner", done: true },
  { label: "Descriere completă", done: true },
  { label: "Program setat", done: true },
  { label: "Cel puțin 5 produse", done: true },
  { label: "Conexiune Stripe pentru încasări", done: false },
];

export function ProfileEditor({
  shopId,
  initial,
}: {
  shopId: string | null;
  initial: ShopProfileInput;
}) {
  const [days, setDays] = useState<Day[]>(INITIAL_DAYS);
  const [form, setForm] = useState<ShopProfileInput>(initial);
  const [pending, startTransition] = useTransition();

  const field = (k: keyof ShopProfileInput) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.currentTarget.value })),
  });

  const toggleDay = (i: number) =>
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, open: !d.open } : d)));

  function save() {
    if (!shopId) {
      toast.error("Niciun magazin asociat contului tău");
      return;
    }
    startTransition(async () => {
      const res = await updateShopProfile(shopId, form);
      if (res.ok) toast.success("Profil salvat");
      else toast.error(res.error ?? "Nu am putut salva profilul");
    });
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
        <div>
          <Title order={2}>Profil magazin</Title>
          <Text c="dimmed">Așa te văd clienții pe SprintR.</Text>
        </div>
        <Button
          leftSection={<Check size={16} />}
          loading={pending}
          disabled={!shopId}
          onClick={save}
        >
          Salvează modificările
        </Button>
      </Group>

      <Group align="flex-start" gap="lg" wrap="nowrap">
        {/* Main column */}
        <Stack gap="lg" style={{ flex: 1, minWidth: 0 }}>
          {/* Banner + logo */}
          <Card p={0} style={{ overflow: "hidden" }}>
            <Box
              h={150}
              p="md"
              style={{
                position: "relative",
                background:
                  "linear-gradient(120deg, var(--mantine-color-ink-9), var(--mantine-color-slate-6))",
              }}
            >
              <Button
                variant="white"
                size="xs"
                leftSection={<ImageIcon size={14} />}
                style={{ position: "absolute", right: 16, bottom: 16 }}
              >
                Schimbă banner
              </Button>
            </Box>
            <Group p="md" gap="md" mt={-40} style={{ position: "relative" }}>
              <ThemeIcon
                size={72}
                radius="lg"
                variant="filled"
                style={{
                  background:
                    "linear-gradient(135deg, var(--mantine-color-slate-8), var(--mantine-color-slate-5))",
                  border: "3px solid var(--mantine-color-body)",
                }}
              >
                <Printer size={32} color="white" />
              </ThemeIcon>
              <Button variant="default" size="xs" mt={32}>
                Schimbă logo
              </Button>
            </Group>
          </Card>

          {/* Shop info */}
          <Card>
            <Text fw={700} mb="md">
              Informații magazin
            </Text>
            <Stack gap="sm">
              <Group grow>
                <TextInput label="Nume" {...field("name")} />
                {/* Not a column on `shops` — visual only for now. */}
                <TextInput
                  label="Tip activitate"
                  defaultValue="Centru de printare & papetărie"
                />
              </Group>
              <Textarea label="Descriere" autosize minRows={2} {...field("description")} />
              <Group grow>
                <TextInput label="Telefon" {...field("phone")} />
                {/* No email column on `shops` — visual only. */}
                <TextInput label="Email" defaultValue="contact@pimcopy.ro" />
              </Group>
              <Group grow>
                <TextInput label="Adresă" {...field("address")} />
                <TextInput label="Oraș" defaultValue="Iași" disabled />
              </Group>
            </Stack>
          </Card>

          {/* Schedule */}
          <Card>
            <Text fw={700} mb="md">
              Program de funcționare
            </Text>
            <Stack gap="xs">
              {days.map((d, i) => (
                <Group key={d.label} justify="space-between" wrap="nowrap">
                  <Group gap="md" wrap="nowrap">
                    <Text fw={500} w={88}>
                      {d.label}
                    </Text>
                    <Switch checked={d.open} onChange={() => toggleDay(i)} />
                  </Group>
                  <Group gap="xs" wrap="nowrap" align="center">
                    <TextInput
                      w={84}
                      size="xs"
                      placeholder="09:00"
                      defaultValue={d.from}
                      disabled={!d.open}
                    />
                    <Text c="dimmed">—</Text>
                    <TextInput
                      w={84}
                      size="xs"
                      placeholder="18:00"
                      defaultValue={d.to}
                      disabled={!d.open}
                    />
                    <Badge
                      w={78}
                      variant="light"
                      color={d.open ? "teal" : "mist"}
                    >
                      {d.open ? "Deschis" : "Închis"}
                    </Badge>
                  </Group>
                </Group>
              ))}
            </Stack>
          </Card>
        </Stack>

        {/* Sidebar */}
        <Box w={300} visibleFrom="md" style={{ flexShrink: 0 }}>
          <Stack gap="lg">
            <Card>
              <Text tt="uppercase" fz="xs" fw={700} c="brand.6" style={{ letterSpacing: 0.6 }}>
                Status profil
              </Text>
              <Group align="baseline" gap={4} mt="xs">
                <Text fz={32} fw={800} c="ink.9" lh={1}>
                  92
                </Text>
                <Text fz="lg" c="dimmed">
                  %
                </Text>
              </Group>
              <Text c="dimmed" fz="sm" mt={2}>
                Complet — magazinul tău e vizibil
              </Text>
              <Stack gap="xs" mt="md">
                {CHECKLIST.map((c) => (
                  <Group key={c.label} gap="sm" wrap="nowrap">
                    {c.done ? (
                      <ThemeIcon size={20} radius="xl" color="teal">
                        <Check size={12} />
                      </ThemeIcon>
                    ) : (
                      <Circle size={20} color="var(--mantine-color-gray-4)" />
                    )}
                    <Text fz="sm" c={c.done ? "ink.9" : "dimmed"}>
                      {c.label}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Card>

            <Card>
              <Text fw={600}>Dezactivează temporar magazinul?</Text>
              <Text fz="sm" c="dimmed" mt={4}>
                Clienții nu vor mai putea plasa comenzi noi, dar comenzile active rămân.
              </Text>
              <Button variant="default" color="red" mt="sm" fullWidth>
                Pauză temporară
              </Button>
            </Card>
          </Stack>
        </Box>
      </Group>
    </Stack>
  );
}
