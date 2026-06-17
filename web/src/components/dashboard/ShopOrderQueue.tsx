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
  Paper,
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

/** Rows revealed per scroll step (DOM-only batching; the full list is already loaded). */
const BATCH = 25;

const initials = (n: string) =>
  n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const short = (id: string) => id.slice(0, 8);

/** Payment badge for the shop: paid / unpaid (online) / pay-on-handover (cash). */
function paymentBadge(o: SampleOrder): {
  label: string;
  color: string;
  variant?: "light" | "filled";
} {
  if (o.paymentStatus === "paid")
    return { label: "Plătită", color: "#166e75", variant: "filled" };
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
  // Rows revealed so far. The full set is already in memory (server-fetched) — this just keeps
  // the DOM light by rendering in batches, auto-growing as the user scrolls. Silent: no control.
  const [visibleCount, setVisibleCount] = useState(BATCH);
  const [pending, startTransition] = useTransition();
  // Search + lazy reveal only on the full Comenzi page (the dashboard preview passes `limit`).
  const paginated = limit === undefined;
  const sentinelRef = useRef<HTMLDivElement>(null);

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

  const isPrep = (s: OrderStatus) => s === "accepted" || s === "in_progress" || s === "in_delivery";
  const q = query.trim().toLowerCase();
  // Search the VISIBLE order number (short #id), client + products — never the raw internal
  // UUID, which isn't shown anywhere and shouldn't be a search term.
  const matchesQuery = (o: SampleOrder) =>
    !q ||
    `#${short(o.id)} ${o.customerName} ${o.customerEmail ?? ""} ${o.customerPhone ?? ""} ${o.lines
      .map((l) => l.title)
      .join(" ")}`
      .toLowerCase()
      .includes(q);
  const inTab = (o: SampleOrder, f: Filter) =>
    f === "all" ? true : f === "new" ? o.status === "pending" : isPrep(o.status);

  const filtered = orders.filter((o) => inTab(o, filter) && matchesQuery(o));
  const total = filtered.length;
  const shown = limit ? filtered.slice(0, limit) : filtered.slice(0, visibleCount);
  const hasMore = !limit && visibleCount < total;
  const count = (f: Filter) => orders.filter((o) => inTab(o, f) && matchesQuery(o)).length;

  // Collapse back to the first batch whenever the result set changes underneath us.
  useEffect(() => {
    setVisibleCount(BATCH);
  }, [query, filter]);

  // Reveal the next batch when the bottom sentinel scrolls into view.
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisibleCount((c) => c + BATCH);
      },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore]);

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
      return o.fulfilment === "delivery" ? (
        <Button
          variant="light"
          color="grape"
          size="xs"
          disabled={pending}
          onClick={() => setStatus(o.id, "in_delivery", `#${short(o.id)} trimisă la livrare`)}
        >
          Trimite la livrare
        </Button>
      ) : (
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
    if (o.status === "in_delivery") {
      return (
        <Button
          variant="light"
          color="teal"
          size="xs"
          disabled={pending}
          onClick={() => setStatus(o.id, "done", `#${short(o.id)} livrată`)}
        >
          Marchează livrată
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
        className="order-row"
        style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
      >
        <Group justify="space-between" wrap="nowrap" gap="md">
          <Link
            href={`/dashboard/orders/${o.id}`}
            style={{ textDecoration: "none", color: "inherit", minWidth: 0, flex: 1, cursor: "pointer" }}
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
            {/* Fixed-width slots so payment pill, price, status & actions line up across every row. */}
            <Box w={48} visibleFrom="md">
              {hasPdf && (
                <Badge variant="light" color="red" leftSection={<FileText size={12} />}>
                  PDF
                </Badge>
              )}
            </Box>
            <Box
              w={150}
              visibleFrom="md"
              style={{ display: "flex", justifyContent: "flex-end" }}
            >
              <Badge
                variant={pb.variant ?? "light"}
                color={pb.color}
                c={pb.variant === "filled" ? "white" : undefined}
                style={{ whiteSpace: "nowrap" }}
              >
                {pb.label}
              </Badge>
            </Box>
            <Box w={90} style={{ flexShrink: 0 }}>
              <Text fw={700} fz="sm" ta="right" style={{ whiteSpace: "nowrap" }}>
                {o.total.toFixed(2)} lei
              </Text>
            </Box>
            {/* Desktop: status (right-aligned, roomy) + actions inline */}
            <Box w={150} visibleFrom="sm" style={{ display: "flex", justifyContent: "flex-end" }}>
              <StatusBadge status={o.status} />
            </Box>
            <Box w={170} ml="xl" visibleFrom="sm" style={{ display: "flex", justifyContent: "flex-end" }}>
              {act}
            </Box>
          </Group>
        </Group>

        {/* Mobile: status + actions on their own row (wraps if the action buttons don't fit). */}
        <Group justify="space-between" hiddenFrom="sm" mt="sm" gap="sm" wrap="wrap">
          <Group gap="xs" wrap="wrap">
            <StatusBadge status={o.status} />
            <Badge
              variant={pb.variant ?? "light"}
              color={pb.color}
              c={pb.variant === "filled" ? "white" : undefined}
              size="sm"
              style={{ whiteSpace: "nowrap" }}
            >
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
          maw={440}
        />
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
        <>
          <Text fz="sm" c="dimmed" ta="center">
            {hasMore
              ? `Afișezi ${Math.min(visibleCount, total)} din ${roCount(total, "comandă", "comenzi")}`
              : roCount(total, "comandă", "comenzi")}
          </Text>
          {/* Auto-reveals the next batch when scrolled near (IntersectionObserver). */}
          {hasMore && <div ref={sentinelRef} aria-hidden style={{ height: 1 }} />}
        </>
      )}
    </Stack>
  );
}
