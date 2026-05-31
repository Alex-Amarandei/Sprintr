"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { Check, Circle, Image as ImageIcon, Printer } from "lucide-react";
import { toast } from "sonner";
import { updateShopProfile } from "@/lib/shop/actions";
import type { ShopProfileInput } from "@/lib/shop/types";
import {
  emailError,
  phoneError,
  sanitizePhoneInput,
} from "@/lib/utils/validation";
import {
  DAY_LABELS,
  DAY_ORDER,
  type WeekdayKey,
  type WeeklySchedule,
} from "@/lib/shop/schedule";

type ProfileText = Omit<ShopProfileInput, "schedule">;

const DEFAULT_HOURS = { open: "09:00", close: "18:00" };

/** Ensure every weekday key is present (missing/null = closed). */
function normalizeWeek(schedule: WeeklySchedule | null): WeeklySchedule {
  return DAY_ORDER.reduce((acc, key) => {
    acc[key] = schedule?.[key] ?? null;
    return acc;
  }, {} as WeeklySchedule);
}

export function ProfileEditor({
  shopId,
  initial,
  schedule: initialSchedule,
  meta,
}: {
  shopId: string | null;
  initial: ProfileText;
  schedule: WeeklySchedule | null;
  meta: { hasLogo: boolean; hasBanner: boolean; itemCount: number };
}) {
  const [form, setForm] = useState<ProfileText>(initial);
  // Email has no `shops` column yet → local state, validated but not persisted.
  const [email, setEmail] = useState("");
  const [schedule, setSchedule] = useState<WeeklySchedule>(() =>
    normalizeWeek(initialSchedule)
  );
  const [pending, startTransition] = useTransition();

  const field = (k: keyof ProfileText) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.currentTarget.value })),
  });

  const toggleDay = (key: WeekdayKey) =>
    setSchedule((s) => ({ ...s, [key]: s[key] ? null : { ...DEFAULT_HOURS } }));
  const setHours = (key: WeekdayKey, part: "open" | "close", value: string) =>
    setSchedule((s) => ({
      ...s,
      [key]: { ...(s[key] ?? DEFAULT_HOURS), [part]: value },
    }));

  // Profile-completeness status — computed from real data + live edits.
  const checklist = useMemo(() => {
    const items = [
      { label: "Logo & banner", done: meta.hasLogo && meta.hasBanner },
      { label: "Descriere completă", done: form.description.trim().length >= 30 },
      { label: "Program setat", done: DAY_ORDER.some((k) => schedule[k] !== null) },
      { label: "Cel puțin 5 produse în catalog", done: meta.itemCount >= 5 },
      { label: "Telefon de contact", done: form.phone.trim().length >= 6 },
    ];
    return items;
  }, [meta, form.description, form.phone, schedule]);

  const doneCount = checklist.filter((c) => c.done).length;
  const percent = Math.round((doneCount / checklist.length) * 100);
  const statusMsg =
    percent === 100
      ? "Profil complet — magazinul tău e vizibil"
      : percent >= 60
        ? "Aproape gata — mai completează câteva detalii"
        : "Completează profilul pentru mai multă vizibilitate";

  function save() {
    if (!shopId) {
      toast.error("Niciun magazin asociat contului tău");
      return;
    }
    startTransition(async () => {
      const res = await updateShopProfile(shopId, { ...form, schedule });
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
              <Tooltip label="Încărcarea imaginilor vine în curând">
                <Button
                  variant="white"
                  size="xs"
                  leftSection={<ImageIcon size={14} />}
                  style={{ position: "absolute", right: 16, bottom: 16 }}
                  data-disabled
                  onClick={(e) => e.preventDefault()}
                >
                  Schimbă banner
                </Button>
              </Tooltip>
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
              <Tooltip label="Încărcarea imaginilor vine în curând">
                <Button variant="default" size="xs" mt={32} data-disabled onClick={(e) => e.preventDefault()}>
                  Schimbă logo
                </Button>
              </Tooltip>
            </Group>
          </Card>

          {/* Shop info */}
          <Card>
            <Text fw={700} mb="md">
              Informații magazin
            </Text>
            <Stack gap="sm">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <TextInput label="Nume" {...field("name")} />
                {/* Not a column on `shops` — visual only for now. */}
                <TextInput
                  label="Tip activitate"
                  defaultValue="Centru de printare & papetărie"
                />
              </SimpleGrid>
              <Textarea label="Descriere" autosize minRows={2} {...field("description")} />
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <TextInput
                  label="Telefon"
                  inputMode="tel"
                  {...field("phone")}
                  onChange={(e) => {
                    const phone = sanitizePhoneInput(e.currentTarget.value);
                    setForm((f) => ({ ...f, phone }));
                  }}
                  error={form.phone ? phoneError(form.phone) : null}
                />
                {/* No email column on `shops` — visual only, but validated. */}
                <TextInput
                  label="Email"
                  type="email"
                  inputMode="email"
                  placeholder="contact@magazin.ro"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  error={email ? emailError(email) : null}
                />
              </SimpleGrid>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <TextInput label="Adresă" {...field("address")} />
                <TextInput label="Oraș" defaultValue="Iași" disabled />
              </SimpleGrid>
            </Stack>
          </Card>

          {/* Schedule */}
          <Card>
            <Text fw={700} mb="md">
              Program de funcționare
            </Text>
            <Stack gap="sm">
              {DAY_ORDER.map((key) => {
                const hours = schedule[key];
                const open = hours !== null;
                return (
                  <Group key={key} justify="space-between" wrap="wrap" gap="xs">
                    <Group gap="md" wrap="nowrap">
                      <Text fw={500} w={88}>
                        {DAY_LABELS[key]}
                      </Text>
                      <Switch checked={open} onChange={() => toggleDay(key)} />
                    </Group>
                    <Group gap="xs" wrap="nowrap" align="center">
                      <TextInput
                        w={84}
                        size="xs"
                        placeholder="09:00"
                        value={hours?.open ?? ""}
                        disabled={!open}
                        onChange={(e) => setHours(key, "open", e.currentTarget.value)}
                      />
                      <Text c="dimmed">—</Text>
                      <TextInput
                        w={84}
                        size="xs"
                        placeholder="18:00"
                        value={hours?.close ?? ""}
                        disabled={!open}
                        onChange={(e) => setHours(key, "close", e.currentTarget.value)}
                      />
                      <Badge w={78} variant="light" color={open ? "teal" : "mist"}>
                        {open ? "Deschis" : "Închis"}
                      </Badge>
                    </Group>
                  </Group>
                );
              })}
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
                <Text fz={32} fw={800} c="var(--mantine-color-text)" lh={1}>
                  {percent}
                </Text>
                <Text fz="lg" c="dimmed">
                  %
                </Text>
              </Group>
              <Progress value={percent} color={percent === 100 ? "teal" : "brand"} size="sm" mt="xs" radius="xl" />
              <Text c="dimmed" fz="sm" mt="xs">
                {statusMsg}
              </Text>
              <Stack gap="xs" mt="md">
                {checklist.map((c) => (
                  <Group key={c.label} gap="sm" wrap="nowrap">
                    {c.done ? (
                      <ThemeIcon size={20} radius="xl" color="teal">
                        <Check size={12} />
                      </ThemeIcon>
                    ) : (
                      <Circle size={20} color="var(--mantine-color-gray-4)" />
                    )}
                    <Text fz="sm" c={c.done ? "var(--mantine-color-text)" : "dimmed"}>
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
              <Tooltip label="Disponibil în curând">
                <Button variant="default" color="red" mt="sm" fullWidth data-disabled onClick={(e) => e.preventDefault()}>
                  Pauză temporară
                </Button>
              </Tooltip>
            </Card>
          </Stack>
        </Box>
      </Group>
    </Stack>
  );
}
