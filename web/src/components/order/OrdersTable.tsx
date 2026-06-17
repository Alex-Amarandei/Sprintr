"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Box,
  Group,
  Paper,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import { ChevronRight } from "lucide-react";
import type { SampleOrder } from "@/lib/orders/sample";
import { TintIcon } from "@/components/ui/TintIcon";
import { SHOP_CATEGORY } from "@/components/shop/category";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { roCount } from "@/lib/utils/format";

type Filter = "all" | "active" | "done" | "rejected";

const ACTIVE: SampleOrder["status"][] = ["pending", "accepted", "in_progress"];

function matches(o: SampleOrder, f: Filter): boolean {
  if (f === "all") return true;
  if (f === "active") return ACTIVE.includes(o.status);
  if (f === "done") return o.status === "done";
  return o.status === "rejected";
}

function OrderRow({ order }: { order: SampleOrder }) {
  const Icon = SHOP_CATEGORY[order.category].icon;
  return (
    <Link
      href={`/order/${order.id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <Group
        justify="space-between"
        wrap="nowrap"
        p="md"
        style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
      >
        <Group gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
          <TintIcon color="mist" size={40} radius="md">
            <Icon size={18} />
          </TintIcon>
          <div style={{ minWidth: 0 }}>
            <Text fw={600} fz="sm">
              #{order.id.slice(0, 8)}
            </Text>
            <Text fz="xs" c="dimmed" truncate>
              {order.shopName} · {order.placedAt}
            </Text>
            {/* Status is hidden on the right on mobile → surface it here instead. */}
            <Box hiddenFrom="sm" mt={6}>
              <StatusBadge status={order.status} size="xs" />
            </Box>
          </div>
        </Group>

        <Group gap="xl" wrap="nowrap">
          <Text fz="sm" c="dimmed" visibleFrom="sm">
            {roCount(order.itemsCount, "produs", "produse")}
          </Text>
          <Text fw={700} fz="sm" w={90} ta="right" style={{ flexShrink: 0 }}>
            {order.total.toFixed(2)} lei
          </Text>
          <Box w={130} visibleFrom="sm">
            <StatusBadge status={order.status} />
            {order.eta && ACTIVE.includes(order.status) && (
              <Text fz={10} c="dimmed" mt={2}>
                ETA {order.eta}
              </Text>
            )}
          </Box>
          <ChevronRight size={16} color="var(--mantine-color-gray-5)" />
        </Group>
      </Group>
    </Link>
  );
}

export function OrdersTable({ orders }: { orders: SampleOrder[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = orders.filter((o) => matches(o, filter));
  const count = (f: Filter) => orders.filter((o) => matches(o, f)).length;

  return (
    <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden" }}>
      <Tabs
        value={filter}
        onChange={(v) => setFilter((v as Filter) ?? "all")}
        color="brand"
      >
        <Tabs.List px="md" pt="xs">
          <Tabs.Tab value="all">Toate ({count("all")})</Tabs.Tab>
          <Tabs.Tab value="active">Active ({count("active")})</Tabs.Tab>
          <Tabs.Tab value="done">Finalizate ({count("done")})</Tabs.Tab>
          <Tabs.Tab value="rejected">Respinse ({count("rejected")})</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {shown.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          Nicio comandă în această categorie.
        </Text>
      ) : (
        <Stack gap={0}>
          {shown.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </Stack>
      )}
    </Paper>
  );
}
