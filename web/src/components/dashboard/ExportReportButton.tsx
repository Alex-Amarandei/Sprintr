"use client";

import { useState } from "react";
import {
  Button,
  Checkbox,
  Group,
  Modal,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { exportShopOrders } from "@/lib/orders/actions";
import { ORDER_STATUS, type OrderStatus } from "@/lib/design/status";
import { roCount } from "@/lib/utils/format";

const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

const PAYMENT_LABEL: Record<string, string> = {
  cash_in_store: "Numerar la magazin",
  cash_on_delivery: "Numerar la livrare",
  online: "Card online",
};

const RANGE_OPTIONS = [
  { value: "week", label: "Săptămâna aceasta" },
  { value: "month", label: "Luna aceasta" },
  { value: "year", label: "Anul acesta" },
  { value: "all", label: "Tot timpul" },
];

const STATUSES: OrderStatus[] = [
  "pending",
  "accepted",
  "in_progress",
  "in_delivery",
  "done",
  "rejected",
];

/** ISO start-of-range for a preset (to = now, so we omit an upper bound). */
function rangeFrom(preset: string): string | undefined {
  const now = new Date();
  if (preset === "all") return undefined;
  if (preset === "month") return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  if (preset === "year") return new Date(now.getFullYear(), 0, 1).toISOString();
  // week — back to Monday
  const dow = now.getDay() || 7;
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  from.setDate(now.getDate() - (dow - 1));
  return from.toISOString();
}

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("ro-RO", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));

export function ExportReportButton() {
  const [opened, setOpened] = useState(false);
  const [preset, setPreset] = useState("month");
  // Default: only completed orders.
  const [statuses, setStatuses] = useState<string[]>(["done"]);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (statuses.length === 0) {
      toast.error("Selectează cel puțin un status.");
      return;
    }
    setLoading(true);
    try {
      const rows = await exportShopOrders({
        from: rangeFrom(preset),
        statuses: statuses as OrderStatus[],
      });
      if (rows.length === 0) {
        toast.error("Nicio comandă pentru filtrele alese.");
        return;
      }
      const headers = [
        "Comandă", "Data", "Status",
        "Total client (lei)", "Comision (lei)", "Încasări (lei)", "Plată",
      ];
      const body = rows.map((o) => [
        `#${o.id.slice(0, 8)}`,
        fmtDate(o.createdAt),
        ORDER_STATUS[o.status].label,
        o.total.toFixed(2),
        o.commission.toFixed(2),
        o.payout.toFixed(2),
        PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod,
      ]);
      const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + f(r), 0);
      const totals = [
        `TOTAL (${rows.length})`, "", "",
        sum((r) => r.total).toFixed(2),
        sum((r) => r.commission).toFixed(2),
        sum((r) => r.payout).toFixed(2),
        "",
      ];
      const csv =
        "﻿" + [headers, ...body, totals].map((r) => r.map(esc).join(",")).join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `raport-${preset}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Raport exportat — ${roCount(rows.length, "comandă", "comenzi")}`);
      setOpened(false);
    } catch {
      toast.error("Exportul a eșuat.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="default"
        leftSection={<Download size={16} />}
        onClick={() => setOpened(true)}
      >
        Export raport
      </Button>
      <Modal opened={opened} onClose={() => setOpened(false)} title="Export raport comenzi" centered>
        <Stack gap="lg">
          <Select
            label="Perioadă"
            data={RANGE_OPTIONS}
            value={preset}
            onChange={(v) => setPreset(v ?? "month")}
            allowDeselect={false}
          />
          <div>
            <Text fz="sm" fw={500} mb="xs">
              Status comenzi
            </Text>
            <Checkbox.Group value={statuses} onChange={setStatuses}>
              <Stack gap="xs">
                {STATUSES.map((s) => (
                  <Checkbox key={s} value={s} label={ORDER_STATUS[s].label} />
                ))}
              </Stack>
            </Checkbox.Group>
          </div>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOpened(false)}>
              Anulează
            </Button>
            <Button leftSection={<Download size={16} />} loading={loading} onClick={run}>
              Descarcă CSV
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
