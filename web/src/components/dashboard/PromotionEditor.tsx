"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { LinkButton } from "@/components/ui/links";
import { createOffer, updateOffer } from "@/lib/offers/api";
import type { OfferInput, OfferRow, OfferScope, OfferTrigger, OfferType } from "@/lib/offers/types";

const TYPE_LABEL: Record<OfferType, string> = {
  percent: "Procent",
  fixed: "Sumă fixă",
  bxgy: "Cumpără X, primești Y",
  free_shipping: "Livrare gratuită",
};

export function PromotionEditor({
  shopId,
  items,
  categories,
  offer,
}: {
  shopId: string;
  items: { id: string; title: string }[];
  categories: { id: string; name: string }[];
  offer?: OfferRow;
}) {
  const router = useRouter();
  const editing = Boolean(offer);
  const cfg = (offer?.config ?? {}) as { percent?: number; amount?: number; buy?: number; get?: number };

  const [name, setName] = useState(offer?.name ?? "");
  const [description, setDescription] = useState(offer?.description ?? "");
  const [type, setType] = useState<OfferType>(offer?.type ?? "percent");
  const [trigger, setTrigger] = useState<OfferTrigger>(offer?.trigger ?? "automatic");
  const [code, setCode] = useState(offer?.code ?? "");
  const [scope, setScope] = useState<OfferScope>(offer?.scope ?? "cart");
  const [targetId, setTargetId] = useState<string | null>(offer?.target_id ?? null);
  const [percent, setPercent] = useState(cfg.percent ?? 10);
  const [amount, setAmount] = useState(cfg.amount ?? 10);
  const [buy, setBuy] = useState(cfg.buy ?? 2);
  const [getN, setGetN] = useState(cfg.get ?? 1);
  const [stackable, setStackable] = useState(offer?.stackable ?? false);
  const [permanent, setPermanent] = useState(!offer?.starts_at && !offer?.ends_at);
  const [startsAt, setStartsAt] = useState(offer?.starts_at?.slice(0, 10) ?? "");
  const [endsAt, setEndsAt] = useState(offer?.ends_at?.slice(0, 10) ?? "");
  const [active, setActive] = useState(offer?.active ?? true);
  const [saving, setSaving] = useState(false);

  // free_shipping is always cart-scoped; otherwise the shop picks the scope.
  const isShipping = type === "free_shipping";
  const effectiveScope: OfferScope = isShipping ? "cart" : scope;

  function changeType(t: OfferType) {
    setType(t);
    if (t === "free_shipping") {
      setScope("cart");
      setTargetId(null);
    }
  }
  function changeScope(s: OfferScope) {
    setScope(s);
    if (s === "cart") setTargetId(null);
  }

  // Disable “Salvează” until the form differs from its initial snapshot — for an edit
  // that's the loaded offer; for a new promo it's the defaults (so an untouched form,
  // which would fail validation anyway, can't be submitted). `useRef` captures the
  // first render's values; a successful save navigates away, so no reset is needed.
  const snapshot = JSON.stringify({
    name, description, type, trigger, code, scope, targetId,
    percent, amount, buy, getN, stackable, permanent, startsAt, endsAt, active,
  });
  const initialSnapshot = useRef(snapshot);
  const dirty = snapshot !== initialSnapshot.current;

  async function save() {
    if (!name.trim()) {
      toast.error("Completează numele promoției.");
      return;
    }
    if (trigger === "code" && !code.trim()) {
      toast.error("Adaugă un cod promoțional.");
      return;
    }
    if (!isShipping && effectiveScope !== "cart" && !targetId) {
      toast.error("Alege produsul sau categoria țintă.");
      return;
    }
    const input: OfferInput = {
      name: name.trim(),
      description: description.trim() || null,
      type,
      scope: effectiveScope,
      target_id: targetId,
      trigger,
      code: trigger === "code" ? code : null,
      config: { percent, amount, buy, get: getN },
      stackable,
      starts_at: permanent || !startsAt ? null : new Date(startsAt).toISOString(),
      ends_at: permanent || !endsAt ? null : new Date(endsAt).toISOString(),
      active,
    };
    setSaving(true);
    try {
      if (editing && offer) await updateOffer(offer.id, input);
      else await createOffer(shopId, input);
      toast.success(editing ? "Promoție actualizată" : "Promoție creată");
      router.push("/dashboard/offers");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message || "Nu am putut salva promoția");
    } finally {
      setSaving(false);
    }
  }

  const valuePreview =
    type === "percent"
      ? `−${percent}%`
      : type === "fixed"
        ? `−${amount} lei`
        : type === "bxgy"
          ? `${buy}+${getN} gratuit`
          : "Livrare gratuită";

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
        <div>
          <Title order={2}>{editing ? "Editează promoția" : "Promoție nouă"}</Title>
          <Text c="dimmed">Atrage clienți cu o reducere sau o ofertă.</Text>
        </div>
        <Group>
          <LinkButton href="/dashboard/offers" variant="default">
            Anulează
          </LinkButton>
          <Button leftSection={<Check size={16} />} onClick={save} loading={saving} disabled={!dirty}>
            Salvează
          </Button>
        </Group>
      </Group>

      <Group align="flex-start" gap="lg" wrap="nowrap">
        <Stack gap="lg" style={{ flex: 1, minWidth: 0 }}>
          <Card>
            <Text fw={700} mb="md">
              Tip promoție
            </Text>
            <SegmentedControl
              fullWidth
              value={type}
              onChange={(v) => changeType(v as OfferType)}
              data={[
                { value: "percent", label: "Procent" },
                { value: "fixed", label: "Sumă fixă" },
                { value: "bxgy", label: "X + Y" },
                { value: "free_shipping", label: "Livrare gratuită" },
              ]}
            />
            <Group grow mt="md" align="flex-start">
              {type === "percent" && (
                <NumberInput label="Procent reducere (%)" min={1} max={100} value={percent} onChange={(v) => setPercent(typeof v === "number" ? v : 0)} />
              )}
              {type === "fixed" && (
                <NumberInput label="Sumă reducere (lei)" min={1} value={amount} onChange={(v) => setAmount(typeof v === "number" ? v : 0)} />
              )}
              {type === "bxgy" && (
                <>
                  <NumberInput label="Cumpără (X)" min={1} value={buy} onChange={(v) => setBuy(typeof v === "number" ? v : 1)} />
                  <NumberInput label="Primești gratuit (Y)" min={1} value={getN} onChange={(v) => setGetN(typeof v === "number" ? v : 1)} />
                </>
              )}
              {isShipping && (
                <Text fz="sm" c="dimmed">
                  Anulează taxa de livrare pentru comenzile eligibile.
                </Text>
              )}
            </Group>
          </Card>

          <Card>
            <Text fw={700} mb="md">
              Aplicare
            </Text>
            <Stack gap="md">
              {!isShipping && (
                <Group grow align="flex-start">
                  <Select
                    label="Se aplică la"
                    allowDeselect={false}
                    data={[
                      { value: "cart", label: "Toată comanda" },
                      { value: "product", label: "Un produs/serviciu" },
                      { value: "category", label: "O categorie" },
                    ]}
                    value={effectiveScope}
                    onChange={(v) => v && changeScope(v as OfferScope)}
                  />
                  {effectiveScope === "product" && (
                    <Select
                      label="Produs/serviciu"
                      placeholder="Alege"
                      searchable
                      data={items.map((i) => ({ value: i.id, label: i.title }))}
                      value={targetId}
                      onChange={setTargetId}
                    />
                  )}
                  {effectiveScope === "category" && (
                    <Select
                      label="Categorie"
                      placeholder="Alege"
                      data={categories.map((c) => ({ value: c.id, label: c.name }))}
                      value={targetId}
                      onChange={setTargetId}
                    />
                  )}
                </Group>
              )}

              <SegmentedControl
                value={trigger}
                onChange={(v) => setTrigger(v as OfferTrigger)}
                data={[
                  { value: "automatic", label: "Automată (se aplică singură)" },
                  { value: "code", label: "Cu cod promoțional" },
                ]}
              />
              {trigger === "code" && (
                <TextInput
                  label="Cod promoțional"
                  placeholder="STUDENT10"
                  value={code}
                  onChange={(e) => setCode(e.currentTarget.value.toUpperCase().replace(/\s/g, ""))}
                />
              )}

              <Switch
                label="Cumulabilă cu alte oferte"
                checked={stackable}
                onChange={(e) => setStackable(e.currentTarget.checked)}
              />
            </Stack>
          </Card>

          <Card>
            <Text fw={700} mb="md">
              Detalii
            </Text>
            <Stack gap="sm">
              <TextInput
                label="Nume"
                placeholder="10% reducere la lucrări de licență"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
              />
              <Textarea
                label="Descriere (opțional)"
                autosize
                minRows={2}
                value={description}
                onChange={(e) => setDescription(e.currentTarget.value)}
              />
              <Switch label="Permanentă" checked={permanent} onChange={(e) => setPermanent(e.currentTarget.checked)} />
              {!permanent && (
                <Group grow>
                  <TextInput label="De la" type="date" value={startsAt} onChange={(e) => setStartsAt(e.currentTarget.value)} />
                  <TextInput label="Până la" type="date" value={endsAt} onChange={(e) => setEndsAt(e.currentTarget.value)} />
                </Group>
              )}
              <Switch label="Activă" checked={active} onChange={(e) => setActive(e.currentTarget.checked)} />
            </Stack>
          </Card>
        </Stack>

        {/* Live preview */}
        <Box w={320} visibleFrom="md" style={{ flexShrink: 0 }}>
          <Text tt="uppercase" fz="xs" fw={700} c="brand.6" mb="sm" style={{ letterSpacing: 0.6 }}>
            Previzualizare
          </Text>
          <Paper withBorder radius="md" p="sm">
            <Group gap={6} mb={4} wrap="wrap">
              <Badge variant="light" color="brand" size="sm">
                {TYPE_LABEL[type]}
              </Badge>
              <Badge variant="light" color={active ? "teal" : "mist"} size="sm">
                {active ? "Activă" : "Inactivă"}
              </Badge>
              {trigger === "code" && code && (
                <Badge variant="outline" color="brand" size="sm">
                  {code}
                </Badge>
              )}
            </Group>
            <Text fw={600} fz="sm">
              {name || "Nume promoție"}
            </Text>
            <Text fz="xs" c="dimmed">
              {permanent ? "Permanent" : `${startsAt || "?"} – ${endsAt || "?"}`} · {valuePreview}
            </Text>
          </Paper>
        </Box>
      </Group>
    </Stack>
  );
}
