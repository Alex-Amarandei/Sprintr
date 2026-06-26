"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ActionIcon,
  Badge,
  Group,
  Paper,
  Stack,
  Switch,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LinkActionIcon, LinkButton } from "@/components/ui/links";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteOffer, setOfferActive } from "@/lib/offers/api";
import type { OfferRow } from "@/lib/offers/types";

const TYPE_LABEL: Record<OfferRow["type"], string> = {
  percent: "Procent",
  fixed: "Sumă fixă",
  bxgy: "Cumpără X, primești Y",
  free_shipping: "Livrare gratuită",
};
const TYPE_COLOR: Record<OfferRow["type"], string> = {
  percent: "brand",
  fixed: "teal",
  bxgy: "cyan",
  free_shipping: "grape",
};

const fmtDate = (s: string) =>
  new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "short" }).format(new Date(s));

function typeValue(o: OfferRow): string {
  const c = (o.config ?? {}) as { percent?: number; amount?: number; buy?: number; get?: number };
  if (o.type === "percent") return `−${c.percent ?? 0}%`;
  if (o.type === "fixed") return `−${c.amount ?? 0} RON`;
  if (o.type === "bxgy") return `${c.buy ?? 0}+${c.get ?? 0} gratuit`;
  return "Livrare gratuită";
}

function windowLabel(o: OfferRow): string {
  if (o.starts_at && o.ends_at) return `${fmtDate(o.starts_at)} – ${fmtDate(o.ends_at)}`;
  if (o.ends_at) return `Până la ${fmtDate(o.ends_at)}`;
  if (o.starts_at) return `Din ${fmtDate(o.starts_at)}`;
  return "Permanent";
}

export function OffersManager({
  canEdit,
  initialOffers,
  items,
  categories,
}: {
  canEdit: boolean;
  initialOffers: OfferRow[];
  items: { id: string; title: string }[];
  categories: { id: string; name: string }[];
}) {
  const [offers, setOffers] = useState<OfferRow[]>(initialOffers);
  const [, startTransition] = useTransition();

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i.title])), [items]);
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  function scopeLabel(o: OfferRow): string {
    if (o.scope === "cart") return "Toată comanda";
    if (o.scope === "product") return `Produs: ${itemMap.get(o.target_id ?? "") ?? "—"}`;
    return `Categorie: ${catMap.get(o.target_id ?? "") ?? "—"}`;
  }

  function toggle(o: OfferRow) {
    const next = !o.active;
    setOffers((prev) => prev.map((x) => (x.id === o.id ? { ...x, active: next } : x)));
    startTransition(async () => {
      try {
        await setOfferActive(o.id, next);
      } catch (e) {
        setOffers((prev) => prev.map((x) => (x.id === o.id ? { ...x, active: o.active } : x)));
        toast.error((e as Error).message || "Nu am putut actualiza promoția");
      }
    });
  }

  function remove(o: OfferRow) {
    const prev = offers;
    setOffers((cur) => cur.filter((x) => x.id !== o.id));
    startTransition(async () => {
      try {
        await deleteOffer(o.id);
        toast.success("Promoție ștearsă");
      } catch (e) {
        setOffers(prev);
        toast.error((e as Error).message || "Nu am putut șterge promoția");
      }
    });
  }

  const activeCount = offers.filter((o) => o.active).length;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
        <div>
          <Title order={2}>Oferte & promoții</Title>
          <Text c="dimmed">
            {offers.length === 0
              ? "Atrage clienți noi cu reduceri și oferte."
              : `${activeCount} active din ${offers.length}.`}
          </Text>
        </div>
        {canEdit && (
          <LinkButton href="/dashboard/offers/new" leftSection={<Plus size={16} />}>
            Promoție nouă
          </LinkButton>
        )}
      </Group>

      {offers.length === 0 ? (
        <EmptyState
          icon={<Tag size={26} />}
          title="Nicio promoție încă"
          description="Creează prima ofertă — automată (se aplică singură) sau cu un cod promoțional."
        />
      ) : (
        <Stack gap="sm">
          {offers.map((o) => (
            <Paper key={o.id} withBorder radius="md" p="md" opacity={o.active ? 1 : 0.6}>
              <Group justify="space-between" wrap="nowrap" align="flex-start" gap="md">
                <div style={{ minWidth: 0 }}>
                  <Group gap={6} mb={6} wrap="wrap">
                    <Badge variant="light" color={TYPE_COLOR[o.type]} size="sm">
                      {TYPE_LABEL[o.type]}
                    </Badge>
                    <Badge variant="filled" color={TYPE_COLOR[o.type]} size="sm">
                      {typeValue(o)}
                    </Badge>
                    <Badge variant="light" color="slate" size="sm">
                      {scopeLabel(o)}
                    </Badge>
                    {o.trigger === "code" ? (
                      <Badge variant="outline" color="brand" size="sm">
                        Cod: {o.code}
                      </Badge>
                    ) : (
                      <Badge variant="light" color="mist" size="sm">
                        Automată
                      </Badge>
                    )}
                    {o.stackable && (
                      <Badge variant="light" color="teal" size="sm">
                        Cumulabilă
                      </Badge>
                    )}
                  </Group>
                  <Text fw={600} fz="sm">
                    {o.name}
                  </Text>
                  <Text fz="xs" c="dimmed">
                    {windowLabel(o)}
                  </Text>
                </div>

                {canEdit && (
                  <Group gap={4} wrap="nowrap">
                    <Switch
                      checked={o.active}
                      onChange={() => toggle(o)}
                      aria-label="Activează/dezactivează"
                    />
                    <Tooltip label="Editează" withArrow>
                      <LinkActionIcon
                        href={`/dashboard/offers/${o.id}/edit`}
                        variant="subtle"
                        color="gray"
                        aria-label="Editează promoția"
                      >
                        <Pencil size={16} />
                      </LinkActionIcon>
                    </Tooltip>
                    <Tooltip label="Șterge" withArrow>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label="Șterge promoția"
                        onClick={() => remove(o)}
                      >
                        <Trash2 size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                )}
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
