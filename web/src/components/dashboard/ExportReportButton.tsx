"use client";

import { Button } from "@mantine/core";
import { Download } from "lucide-react";
import { toast } from "sonner";
import type { SampleOrder } from "@/lib/orders/sample";
import { ORDER_STATUS } from "@/lib/design/status";
import { roCount } from "@/lib/utils/format";

const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** Exports the shop's real orders as a CSV (opens in Excel). */
export function ExportReportButton({ orders }: { orders: SampleOrder[] }) {
  function exportCsv() {
    const headers = ["Comandă", "Client", "Magazin", "Produse", "Total (lei)", "Status", "Plasată"];
    const rows = orders.map((o) => [
      `#${o.id}`,
      o.customerName,
      o.shopName,
      roCount(o.itemsCount, "produs", "produse"),
      o.total.toFixed(2),
      ORDER_STATUS[o.status].label,
      o.placedAt,
    ]);
    // BOM so Excel reads UTF-8 diacritics correctly.
    const csv =
      "﻿" + [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "raport-comenzi.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Raport exportat — ${roCount(orders.length, "comandă", "comenzi")}`);
  }

  return (
    <Button variant="default" leftSection={<Download size={16} />} onClick={exportCsv}>
      Export raport
    </Button>
  );
}
