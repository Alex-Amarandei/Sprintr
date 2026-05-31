"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  Pagination,
  Paper,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";
import { Check, FileText, Search, X } from "lucide-react";
import { toast } from "sonner";
import type { SampleOrder } from "@/lib/orders/sample";
import type { OrderStatus } from "@/lib/design/status";
import { advanceOrderStatus } from "@/lib/orders/actions";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { roCount } from "@/lib/utils/format";

type Filter = "all" | "new" | "prep";

const initials = (n: string) =>
  n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const short = (id: string) => id.slice(0, 8);

/** Payment badge for the shop: paid / unpaid (online) / pay-on-handover (cash). */
function paymentBadge(o: SampleOrder): { label: string; color: string } {
  if (o.paymentStatus === "paid") return { label: "Plătită", color: "teal" };
  if (o.paymentStatus === "refunded") return { label: "Rambursată", color: "gray" };
  if (o.online) {
    return o.paymentStatus === "failed"
      ? { label: "Plată eșuată", color: "red" }
      : { label: "Neplătită", color: "orange" };
  }
  return { label: "Plată la primire", color: "gray" };
}

/**
 * Shop-side incoming order queue with inline accept/reject/advance.
 * Optimistic update + server persistence via the `advanceOrderStatus` action.
 */
export function ShopOrderQueue({
  initialOrders,
  limit,
  showTabs = true,
}: {
  initialOrders: SampleOrder[];
  limit?: number;
  showTabs?: boolean;
}) {
  const [orders, setOrders] = useState<SampleOrder[]>(initialOrders);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [pending, startTransition] = useTransition();
  // Search + pagination only on the full Comenzi page (the dashboard preview passes `limit`).
  const paginated = limit === undefined;

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const channelKey = useId();
  const seenIds = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)));

  // Adopt fresh server data after a re-fetch, and toast for any order that NEWLY became
  // visible — a cash order placed, or an online order that just got paid. Diffing the
  // fetched list (not raw INSERT events) means unpaid/abandoned online orders, which the
  // server filters out until paid, never trigger a false "new order" alert.
  useEffect(() => {
    const fresh = initialOrders.filter((o) => !seenIds.current.has(o.id));
    if (fresh.length) {
      toast.success(
        fresh.length === 1 ? "Comandă nouă primită 🛎️" : `${fresh.length} comenzi noi 🛎️`
      );
      fresh.forEach((o) => seenIds.current.add(o.id));
    }
    setOrders(initialOrders);
  }, [initialOrders]);

  // Live queue: any order insert/update for this shop triggers a re-fetch. RLS scopes
  // Realtime delivery to this shop's own orders, so no shop_id filter is needed. The
  // re-fetch re-applies the "paid online / cash" visibility filter. Push-based — no polling.
  useEffect(() => {
    const channel = supabase
      .channel(`shop-orders-${channelKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => router.refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router, channelKey]);

  function setStatus(id: string, status: OrderStatus, msg: string) {
    const prev = orders;
    setOrders((cur) => cur.map((o) => (o.id === id ? { ...o, status } : o))); // optimistic
    startTransition(async () => {
      const res = await advanceOrderStatus(id, status);
      if (res.ok) {
        toast.success(msg);
      } else {
        setOrders(prev); // rollback
        toast.error(res.error ?? "Nu am putut actualiza comanda");
      }
    });
  }

  const isPrep = (s: OrderStatus) => s === "accepted" || s === "in_progress";
  const q = query.trim().toLowerCase();
  const matchesQuery = (o: SampleOrder) =>
    !q ||
    `#${short(o.id)} ${o.id} ${o.customerName} ${o.customerEmail ?? ""} ${o.customerPhone ?? ""} ${o.lines
      .map((l) => l.title)
      .join(" ")}`
      .toLowerCase()
      .includes(q);
  const inTab = (o: SampleOrder, f: Filter) =>
    f === "all" ? true : f === "new" ? o.status === "pending" : isPrep(o.status);

  const filtered = orders.filter((o) => inTab(o, filter) && matchesQuery(o));
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const shown = limit
    ? filtered.slice(0, limit)
    : filtered.slice((page - 1) * pageSize, page * pageSize);
  const count = (f: Filter) => orders.filter((o) => inTab(o, f) && matchesQuery(o)).length;

  // Reset to the first page whenever the result set changes underneath us.
  useEffect(() => {
    setPage(1);
  }, [query, filter, pageSize]);

  function actions(o: SampleOrder) {
    if (o.status === "pending") {
      return (
        <Group gap="xs" wrap="nowrap">
          <Button
            variant="default"
            // Theme-aware surface (see ShopOrderActions): soft stone in light mode, dark
            // raised-surface token in dark mode — a hardcoded `stone.0` made the default
            // variant's light text unreadable on a near-white button in dark mode.
            bg="light-dark(var(--mantine-color-stone-0), var(--mantine-color-dark-6))"
            size="xs"
            disabled={pending}
            onClick={() => setStatus(o.id, "rejected", `Comanda #${short(o.id)} respinsă`)}
          >
            Respinge
          </Button>
          <Button
            color="teal"
            size="xs"
            leftSection={<Check size={14} />}
            disabled={pending}
            onClick={() => setStatus(o.id, "accepted", `Comanda #${short(o.id)} acceptată`)}
          >
            Acceptă
          </Button>
        </Group>
      );
    }
    if (o.status === "accepted") {
      return (
        <Button
          variant="light"
          color="cyan"
          size="xs"
          disabled={pending}
          onClick={() => setStatus(o.id, "in_progress", `#${short(o.id)} în pregătire`)}
        >
          Începe pregătirea
        </Button>
      );
    }
    if (o.status === "in_progress") {
      return (
        <Button
          variant="light"
          color="teal"
          size="xs"
          disabled={pending}
          onClick={() => setStatus(o.id, "done", `#${short(o.id)} finalizată`)}
        >
          Marchează gata
        </Button>
      );
    }
    return null;
  }

  const row = (o: SampleOrder) => {
    const hasPdf = o.lines.some((l) => l.pdfName);
    const act = actions(o);
    const pb = paymentBadge(o);
    return (
      <Box
        key={o.id}
        p="md"
        style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
      >
        <Group justify="space-between" wrap="nowrap" gap="md">
          <Link
            href={`/dashboard/orders/${o.id}`}
            style={{ textDecoration: "none", color: "inherit", minWidth: 0, flex: 1 }}
          >
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
              <Avatar
                radius="xl"
                size={38}
                style={
                  {
                    "--avatar-bg": "var(--mantine-color-brand-1)",
                    "--avatar-color": "var(--mantine-color-brand-7)",
                  } as React.CSSProperties
                }
              >
                {initials(o.customerName)}
              </Avatar>
              <div style={{ minWidth: 0 }}>
                <Group gap={6}>
                  <Text fw={600} fz="sm">
                    #{short(o.id)}
                  </Text>
                  <Text fz="xs" c="dimmed">
                    · {o.placedAt}
                  </Text>
                </Group>
                <Text fz="sm" truncate>
                  {o.customerName} · {o.lines[0]?.title}
                  {o.itemsCount > 1 ? ` +${o.itemsCount - 1}` : ""}
                </Text>
              </div>
            </Group>
          </Link>

          <Group gap="md" wrap="nowrap">
            {hasPdf && (
              <Badge variant="light" color="red" leftSection={<FileText size={12} />} visibleFrom="md">
                PDF
              </Badge>
            )}
            <Badge variant="light" color={pb.color} visibleFrom="md" style={{ whiteSpace: "nowrap" }}>
              {pb.label}
            </Badge>
            <Text fw={700} fz="sm" ta="right" style={{ whiteSpace: "nowrap" }}>
              {o.total.toFixed(2)} lei
            </Text>
            {/* Desktop: status + actions inline */}
            <Box w={118} visibleFrom="sm">
              <StatusBadge status={o.status} />
            </Box>
            <Box w={170} ml="xl" visibleFrom="sm" style={{ display: "flex", justifyContent: "flex-end" }}>
              {act}
            </Box>
          </Group>
        </Group>

        {/* Mobile: status + actions on their own row */}
        <Group justify="space-between" hiddenFrom="sm" mt="sm" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <StatusBadge status={o.status} />
            <Badge variant="light" color={pb.color} size="sm" style={{ whiteSpace: "nowrap" }}>
              {pb.label}
            </Badge>
          </Group>
          {act}
        </Group>
      </Box>
    );
  };

  return (
    <Stack gap="md">
      {paginated && (
        <Group justify="space-between" wrap="wrap" gap="sm">
          <TextInput
            placeholder="Caută după #comandă, client sau produs…"
            leftSection={<Search size={16} />}
            rightSection={
              query ? (
                <ActionIcon variant="subtle" color="gray" onClick={() => setQuery("")} aria-label="Șterge căutarea">
                  <X size={14} />
                </ActionIcon>
              ) : null
            }
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 240 }}
          />
          <Group gap="xs" wrap="nowrap">
            <Text fz="sm" c="dimmed">
              Pe pagină
            </Text>
            <Select
              data={["20", "50", "100"]}
              value={String(pageSize)}
              onChange={(v) => setPageSize(Number(v) || 20)}
              allowDeselect={false}
              w={92}
              aria-label="Comenzi pe pagină"
            />
          </Group>
        </Group>
      )}

      <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden" }}>
        {showTabs && (
          <Tabs value={filter} onChange={(v) => setFilter((v as Filter) ?? "all")} color="brand">
            <Tabs.List px="md" pt="xs">
              <Tabs.Tab value="all">Toate ({count("all")})</Tabs.Tab>
              <Tabs.Tab value="new">Noi ({count("new")})</Tabs.Tab>
              <Tabs.Tab value="prep">În pregătire ({count("prep")})</Tabs.Tab>
            </Tabs.List>
          </Tabs>
        )}
        {shown.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            {q ? `Niciun rezultat pentru „${query}".` : "Nicio comandă aici."}
          </Text>
        ) : (
          <Stack gap={0}>{shown.map(row)}</Stack>
        )}
      </Paper>

      {paginated && total > 0 && (
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Text fz="sm" c="dimmed">
            {roCount(total, "comandă", "comenzi")}
          </Text>
          {pageCount > 1 && (
            <Pagination total={pageCount} value={page} onChange={setPage} color="brand" size="sm" />
          )}
        </Group>
      )}
    </Stack>
  );
}
