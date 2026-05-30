"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import { Check, FileText, X } from "lucide-react";
import { toast } from "sonner";
import type { SampleOrder } from "@/lib/orders/sample";
import type { OrderStatus } from "@/lib/design/status";
import { StatusBadge } from "@/components/ui/StatusBadge";

type Filter = "all" | "new" | "prep";

const initials = (n: string) =>
  n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/**
 * Shop-side incoming order queue with inline accept/reject/advance.
 * Status changes are local (presentational) — TODO(BE): wire to order updates.
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

  function setStatus(id: string, status: OrderStatus, msg: string) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    toast.success(msg);
  }

  const isPrep = (s: OrderStatus) => s === "accepted" || s === "in_progress";
  const filtered = orders.filter((o) =>
    filter === "all" ? true : filter === "new" ? o.status === "pending" : isPrep(o.status)
  );
  const shown = limit ? filtered.slice(0, limit) : filtered;
  const count = (f: Filter) =>
    orders.filter((o) =>
      f === "all" ? true : f === "new" ? o.status === "pending" : isPrep(o.status)
    ).length;

  function actions(o: SampleOrder) {
    if (o.status === "pending") {
      return (
        <Group gap="xs" wrap="nowrap">
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            onClick={() => setStatus(o.id, "rejected", `Comanda #${o.id} respinsă`)}
          >
            Respinge
          </Button>
          <Button
            color="teal"
            size="xs"
            leftSection={<Check size={14} />}
            onClick={() => setStatus(o.id, "accepted", `Comanda #${o.id} acceptată`)}
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
          onClick={() => setStatus(o.id, "in_progress", `#${o.id} în pregătire`)}
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
          onClick={() => setStatus(o.id, "done", `#${o.id} finalizată`)}
        >
          Marchează gata
        </Button>
      );
    }
    return null;
  }

  const row = (o: SampleOrder) => {
    const hasPdf = o.lines.some((l) => l.pdfName);
    return (
      <Group
        key={o.id}
        justify="space-between"
        wrap="nowrap"
        p="md"
        gap="md"
        style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
      >
        <Link
          href={`/dashboard/orders/${o.id}`}
          style={{ textDecoration: "none", color: "inherit", minWidth: 0, flex: 1 }}
        >
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <Avatar radius="xl" color="brand" size={38}>
              {initials(o.customerName)}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <Group gap={6}>
                <Text fw={600} fz="sm">
                  #{o.id}
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
          <Text fw={700} fz="sm" w={84} ta="right" style={{ whiteSpace: "nowrap" }}>
            {o.total.toFixed(2)} lei
          </Text>
          <Box w={118} visibleFrom="sm">
            <StatusBadge status={o.status} />
          </Box>
          <Box w={170} style={{ display: "flex", justifyContent: "flex-end" }}>
            {actions(o)}
          </Box>
        </Group>
      </Group>
    );
  };

  return (
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
          Nicio comandă aici.
        </Text>
      ) : (
        <Stack gap={0}>{shown.map(row)}</Stack>
      )}
    </Paper>
  );
}
