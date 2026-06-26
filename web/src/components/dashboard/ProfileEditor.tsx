"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Group,
  NumberInput,
  Progress,
  SimpleGrid,
  Stack,
  Switch,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { Check, Circle, Image as ImageIcon, Printer } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { setShopActive, setShopImage, setShopPause, updateShopProfile } from "@/lib/shop/actions";
import type { ShopProfileInput } from "@/lib/shop/types";
import { shopAssetUrl, uploadShopAsset } from "@/lib/storage/shopAssets";
import { MAX_IMAGE_MB } from "@/lib/catalog/images";
import {
  emailError,
  phoneError,
  sanitizePhoneInput,
} from "@/lib/utils/validation";
import { formatTimeInput } from "@/lib/utils/format";
import {
  DAY_LABELS,
  DAY_ORDER,
  type WeekdayKey,
  type WeeklySchedule,
} from "@/lib/shop/schedule";

type ProfileText = Omit<ShopProfileInput, "schedule">;

const DEFAULT_HOURS = { open: "09:00", close: "18:00" };

const todayKey = () => new Date().toISOString().slice(0, 10);

/** Last consecutive closed (override === null) day starting today, or null if not paused. */
function pausedUntil(
  overrides: Record<string, { open: string; close: string } | null>
): string | null {
  const d = new Date(`${todayKey()}T00:00:00Z`);
  let last: string | null = null;
  for (let guard = 0; guard < 400; guard++) {
    const key = d.toISOString().slice(0, 10);
    if (overrides[key] === null) {
      last = key;
      d.setUTCDate(d.getUTCDate() + 1);
    } else break;
  }
  return last;
}

const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long" }).format(new Date(`${iso}T00:00:00`));

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
  scheduleOverrides,
  isActive,
  logoPath: initialLogo,
  bannerPath: initialBanner,
  meta,
}: {
  shopId: string | null;
  initial: ProfileText;
  schedule: WeeklySchedule | null;
  scheduleOverrides: Record<string, { open: string; close: string } | null>;
  isActive: boolean;
  logoPath: string | null;
  bannerPath: string | null;
  meta: { itemCount: number; commissionRate: number };
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProfileText>(initial);
  const [schedule, setSchedule] = useState<WeeklySchedule>(() =>
    normalizeWeek(initialSchedule)
  );
  const [pending, startTransition] = useTransition();

  // Temporary pause (writes `schedule_overrides`, no `is_active` column). Derived live from the
  // server prop so it refreshes after the action.
  const pauseUntilCurrent = pausedUntil(scheduleOverrides);
  const [pauseDate, setPauseDate] = useState(todayKey());
  const [pausing, setPausing] = useState(false);

  async function applyPause(until: string | null) {
    if (!shopId) {
      toast.error("Niciun magazin asociat contului tău");
      return;
    }
    setPausing(true);
    const res = await setShopPause(until);
    setPausing(false);
    if (res.ok) {
      toast.success(until ? "Magazinul a fost pus în pauză" : "Activitate reluată");
      router.refresh();
    } else {
      toast.error(res.error ?? "Nu am putut actualiza pauza");
    }
  }

  // Hard on/off visibility (`is_active`) — distinct from the temporary pause above.
  const [togglingActive, setTogglingActive] = useState(false);
  async function toggleActive(active: boolean) {
    if (!shopId) {
      toast.error("Niciun magazin asociat contului tău");
      return;
    }
    setTogglingActive(true);
    const res = await setShopActive(active);
    setTogglingActive(false);
    if (res.ok) {
      toast.success(active ? "Magazinul este din nou activ" : "Magazinul a fost dezactivat");
      router.refresh();
    } else {
      toast.error(res.error ?? "Nu am putut actualiza vizibilitatea");
    }
  }
  // Baseline of what's currently persisted, for dirty-tracking. Updated after each
  // successful save so the button re-disables once there's nothing new to write.
  // (Logo/banner/email persist via their own paths and aren't part of this payload.)
  const [baseline, setBaseline] = useState<{ text: ProfileText; schedule: WeeklySchedule }>(
    () => ({ text: initial, schedule: normalizeWeek(initialSchedule) })
  );

  const [logoPath, setLogoPath] = useState<string | null>(initialLogo);
  const [bannerPath, setBannerPath] = useState<string | null>(initialBanner);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoUrl = shopAssetUrl(logoPath);
  const bannerUrl = shopAssetUrl(bannerPath);

  async function handleUpload(kind: "logo" | "banner", file: File | null) {
    if (!file) return;
    if (!shopId) {
      toast.error("Niciun magazin asociat contului tău");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Alege o imagine.");
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`Imaginea depășește ${MAX_IMAGE_MB} MB.`);
      return;
    }
    const setUploading = kind === "logo" ? setUploadingLogo : setUploadingBanner;
    setUploading(true);
    try {
      const path = await uploadShopAsset(file, shopId, kind);
      const res = await setShopImage(shopId, kind, path);
      if (!res.ok) throw new Error(res.error);
      if (kind === "logo") setLogoPath(path);
      else setBannerPath(path);
      toast.success(kind === "logo" ? "Logo actualizat" : "Banner actualizat");
    } catch (e) {
      toast.error((e as Error).message || "Încărcarea a eșuat");
    } finally {
      setUploading(false);
    }
  }

  // Only the string-valued profile fields bind through this helper (NumberInput fields
  // like defaultEtaMinutes are wired separately).
  type StringKey = {
    [K in keyof ProfileText]-?: ProfileText[K] extends string ? K : never;
  }[keyof ProfileText];
  const field = (k: StringKey) => ({
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
      { label: "Logo & banner", done: Boolean(logoPath) && Boolean(bannerPath) },
      { label: "Descriere completă", done: form.description.trim().length >= 30 },
      { label: "Program setat", done: DAY_ORDER.some((k) => schedule[k] !== null) },
      { label: "Cel puțin 5 produse în catalog", done: meta.itemCount >= 5 },
      {
        label: "Telefon de contact",
        done: form.phones.some((p) => p.trim().length >= 6),
      },
    ];
    return items;
  }, [meta, form.description, form.phones, schedule, logoPath, bannerPath]);

  const doneCount = checklist.filter((c) => c.done).length;
  const percent = Math.round((doneCount / checklist.length) * 100);
  const statusMsg =
    percent === 100
      ? "Profil complet — magazinul tău e vizibil"
      : percent >= 60
        ? "Aproape gata — mai completează câteva detalii"
        : "Completează profilul pentru mai multă vizibilitate";

  // Has anything in this button's payload (text fields + schedule) changed since the
  // last save? Drives the disabled state so an untouched form can't be re-saved.
  const dirty = useMemo(() => {
    const textChanged = (Object.keys(form) as (keyof ProfileText)[]).some(
      (k) => form[k] !== baseline.text[k]
    );
    return textChanged || JSON.stringify(schedule) !== JSON.stringify(baseline.schedule);
  }, [form, schedule, baseline]);

  function save() {
    if (!shopId) {
      toast.error("Niciun magazin asociat contului tău");
      return;
    }
    startTransition(async () => {
      const res = await updateShopProfile(shopId, { ...form, schedule });
      if (res.ok) {
        // Snapshot the just-saved values as the new baseline → button re-disables.
        setBaseline({ text: form, schedule });
        toast.success("Profil salvat");
      } else toast.error(res.error ?? "Nu am putut salva profilul");
    });
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
        <div>
          <Title order={2}>Profil magazin</Title>
          <Text c="dimmed">Așa te văd clienții pe Sprintr.</Text>
        </div>
        <Button
          leftSection={<Check size={16} />}
          loading={pending}
          disabled={!shopId || !dirty}
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
                backgroundColor: "var(--mantine-color-ink-9)",
                backgroundImage: bannerUrl
                  ? `url(${bannerUrl})`
                  : "linear-gradient(120deg, var(--mantine-color-ink-9), var(--mantine-color-slate-6))",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <Button
                variant="white"
                size="xs"
                leftSection={<ImageIcon size={14} />}
                // Top-right: the logo Group below uses mt={-40}, overlapping the banner's
                // bottom strip and stacking above it — a bottom-anchored button there would
                // be covered and unclickable.
                style={{ position: "absolute", right: 16, top: 16, zIndex: 1 }}
                loading={uploadingBanner}
                disabled={!shopId}
                onClick={() => bannerInputRef.current?.click()}
              >
                Schimbă banner
              </Button>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  handleUpload("banner", e.currentTarget.files?.[0] ?? null);
                  e.currentTarget.value = "";
                }}
              />
            </Box>
            <Group p="md" gap="md" mt={-40} style={{ position: "relative" }}>
              {logoUrl ? (
                <Avatar
                  src={logoUrl}
                  size={72}
                  radius="lg"
                  style={{ border: "3px solid var(--mantine-color-body)" }}
                />
              ) : (
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
              )}
              <Button
                variant="default"
                size="xs"
                mt={32}
                loading={uploadingLogo}
                disabled={!shopId}
                onClick={() => logoInputRef.current?.click()}
              >
                Schimbă logo
              </Button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  handleUpload("logo", e.currentTarget.files?.[0] ?? null);
                  e.currentTarget.value = "";
                }}
              />
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
                <TagsInput
                  label="Telefoane"
                  inputMode="tel"
                  placeholder="ex. 0729 992 968"
                  value={form.phones}
                  onChange={(phones) =>
                    setForm((f) => ({
                      ...f,
                      phones: phones.map(sanitizePhoneInput),
                    }))
                  }
                  error={form.phones.map((p) => phoneError(p)).find(Boolean) ?? null}
                />
                <TextInput
                  label="Email"
                  type="email"
                  inputMode="email"
                  placeholder="contact@magazin.ro"
                  {...field("email")}
                  error={form.email ? emailError(form.email) : null}
                />
              </SimpleGrid>
              <TextInput
                label="Website"
                inputMode="url"
                placeholder="https://exemplu.ro"
                {...field("website")}
              />
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <TextInput label="Adresă" {...field("address")} />
                <TextInput label="Oraș" defaultValue="Iași" disabled />
              </SimpleGrid>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <NumberInput
                  label="Taxă de livrare (lei)"
                  description="Per comandă cu livrare. Taxa de serviciu (2 RON) e fixă și nu poate fi modificată."
                  placeholder="ex. 10"
                  min={0}
                  step={1}
                  decimalScale={2}
                  value={form.deliveryFee ?? 0}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      deliveryFee: v === "" || v == null ? 0 : Number(v),
                    }))
                  }
                />
                <NumberInput
                  label="Timp estimat de pregătire (minute)"
                  description="Implicit pentru comenzi noi; îl poți ajusta pe fiecare comandă. Vizibil clientului."
                  placeholder="ex. 30"
                  min={0}
                  step={5}
                  value={form.defaultEtaMinutes ?? ""}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      defaultEtaMinutes: v === "" || v == null ? null : Number(v),
                    }))
                  }
                />
              </SimpleGrid>

              {/* Platform commission — read-only (admin-set). Lets the shop see exactly what it keeps. */}
              <Card withBorder bg="var(--mantine-color-default-hover)" p="sm" radius="md">
                <Group justify="space-between" wrap="nowrap" gap="sm">
                  <div>
                    <Text fw={600} fz="sm">
                      Comision platformă: {(meta.commissionRate * 100).toFixed(meta.commissionRate * 100 % 1 === 0 ? 0 : 2)}%
                    </Text>
                    <Text fz="xs" c="dimmed">
                      Se aplică la valoarea produselor (după reduceri) și se scade din încasările tale.
                      Încasezi = produse − comision + livrare. Taxa de serviciu și comisioanele de plată
                      online sunt suportate de platformă, nu de tine.
                    </Text>
                  </div>
                </Group>
              </Card>
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
                        onBlur={(e) => setHours(key, "open", formatTimeInput(e.currentTarget.value))}
                      />
                      <Text c="dimmed">—</Text>
                      <TextInput
                        w={84}
                        size="xs"
                        placeholder="18:00"
                        value={hours?.close ?? ""}
                        disabled={!open}
                        onChange={(e) => setHours(key, "close", e.currentTarget.value)}
                        onBlur={(e) => setHours(key, "close", formatTimeInput(e.currentTarget.value))}
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
              {pauseUntilCurrent ? (
                <>
                  <Group gap="xs">
                    <Badge color="red" variant="light">
                      În pauză
                    </Badge>
                    <Text fw={600}>Magazin închis temporar</Text>
                  </Group>
                  <Text fz="sm" c="dimmed" mt={4}>
                    Închis până la {fmtDay(pauseUntilCurrent)} inclusiv. Clienții văd magazinul ca
                    fiind închis și nu pot plasa comenzi.
                  </Text>
                  <Button
                    color="teal"
                    mt="sm"
                    fullWidth
                    loading={pausing}
                    disabled={!shopId}
                    onClick={() => applyPause(null)}
                  >
                    Reia activitatea
                  </Button>
                </>
              ) : (
                <>
                  <Text fw={600}>Pune magazinul în pauză?</Text>
                  <Text fz="sm" c="dimmed" mt={4}>
                    Marchează magazinul închis până la o dată aleasă. Clienții nu mai pot plasa
                    comenzi; comenzile active rămân.
                  </Text>
                  <TextInput
                    type="date"
                    label="Până la (inclusiv)"
                    mt="sm"
                    min={todayKey()}
                    value={pauseDate}
                    onChange={(e) => setPauseDate(e.currentTarget.value)}
                  />
                  <Button
                    variant="default"
                    color="red"
                    mt="sm"
                    fullWidth
                    loading={pausing}
                    disabled={!shopId || !pauseDate}
                    onClick={() => applyPause(pauseDate)}
                  >
                    Pune în pauză
                  </Button>
                </>
              )}
            </Card>

            {/* Hard on/off visibility — distinct from the temporary pause above. */}
            <Card>
              <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
                <div style={{ minWidth: 0 }}>
                  <Text fw={600}>Magazin activ</Text>
                  <Text fz="sm" c="dimmed" mt={4}>
                    Dezactivat, magazinul dispare din listă și nu mai poate fi accesat de clienți
                    (nici prin link direct). Diferit de pauza temporară.
                  </Text>
                </div>
                <Switch
                  checked={isActive}
                  disabled={!shopId || togglingActive}
                  onChange={(e) => toggleActive(e.currentTarget.checked)}
                  aria-label="Magazin activ"
                  style={{ flexShrink: 0 }}
                />
              </Group>
            </Card>
          </Stack>
        </Box>
      </Group>
    </Stack>
  );
}
