"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Checkbox, Group, Stack, Text } from "@mantine/core";
import { PackageX } from "lucide-react";
import { toast } from "sonner";
import { rejectOrderLines } from "@/lib/orders/actions";
import type { SampleOrderLine } from "@/lib/orders/sample";
import { isTerminalStatus, type OrderStatus } from "@/lib/design/status";

/**
 * Shop-side control to reject a subset of an order's lines (e.g. out of stock). Shown only while the
 * order is active and there are ≥2 still-active lines (rejecting all = reject the whole order). The
 * action partial-refunds the customer (paid online) and reduces the order total.
 */
export function RejectLinesControl({
  orderId,
  orderStatus,
  lines,
}: {
  orderId: string;
  orderStatus: OrderStatus;
  lines: SampleOrderLine[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  const active = !isTerminalStatus(orderStatus);
  const candidates = lines.filter((l) => l.lineId && !l.rejected);
  if (!active || candidates.length < 2) return null;

  const refund = candidates
    .filter((l) => selected.includes(l.lineId!))
    .reduce((s, l) => s + l.lineTotal, 0);

  async function submit() {
    if (!selected.length) return;
    if (selected.length >= candidates.length) {
      toast.error("Nu poți respinge toate produsele — respinge întreaga comandă.");
      return;
    }
    setPending(true);
    const res = await rejectOrderLines(orderId, selected);
    setPending(false);
    if (res.ok) {
      toast.success("Produse respinse — clientul e rambursat dacă a plătit online");
      setSelected([]);
      router.refresh();
    } else {
      toast.error(res.error ?? "Nu am putut respinge produsele");
    }
  }

  return (
    <Card>
      <Group gap="xs" mb="xs">
        <PackageX size={18} />
        <Text fw={700}>Respinge produse indisponibile</Text>
      </Group>
      <Text fz="xs" c="dimmed" mb="sm">
        Bifează produsele pe care nu le poți onora — sunt scoase din comandă, iar clientul e
        rambursat automat (la plata online). Trebuie să rămână cel puțin un produs.
      </Text>
      <Stack gap="xs">
        {candidates.map((l) => (
          <Checkbox
            key={l.lineId}
            checked={selected.includes(l.lineId!)}
            onChange={(e) =>
              setSelected((prev) =>
                e.currentTarget.checked
                  ? [...prev, l.lineId!]
                  : prev.filter((id) => id !== l.lineId),
              )
            }
            styles={{ labelWrapper: { flex: 1 }, body: { alignItems: "center" } }}
            label={
              <Group justify="space-between" wrap="nowrap" style={{ width: "100%" }}>
                <Text fz="sm" truncate>
                  {l.title}
                </Text>
                <Text fz="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                  {l.lineTotal.toFixed(2)} RON
                </Text>
              </Group>
            }
          />
        ))}
      </Stack>
      <Button
        color="red"
        variant="light"
        mt="md"
        fullWidth
        loading={pending}
        disabled={!selected.length}
        onClick={submit}
      >
        {selected.length > 0
          ? `Respinge (${refund.toFixed(2)} RON rambursare)`
          : "Respinge produsele selectate"}
      </Button>
    </Card>
  );
}
