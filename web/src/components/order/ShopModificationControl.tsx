"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Group, NumberInput, Stack, Text, TextInput } from "@mantine/core";
import { PencilLine } from "lucide-react";
import { toast } from "sonner";
import { cancelModification, proposeModification } from "@/lib/orders/modifications";
import type { OrderStatus } from "@/lib/design/status";
import type { OrderModificationView } from "@/lib/orders/queries";

const MODIFIABLE: OrderStatus[] = ["accepted", "in_progress", "ready_for_pickup", "in_delivery"];

/**
 * Shop-side order-modification control on the order detail. Propose a signed adjustment (+ extra /
 * − reduction) + reason for the customer to accept; while one is pending, show it with a cancel.
 */
export function ShopModificationControl({
  orderId,
  orderStatus,
  modification,
}: {
  orderId: string;
  orderStatus: OrderStatus;
  modification: OrderModificationView | null;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState<number | string>("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  // A pending proposal awaiting the customer — show it with a cancel action.
  if (modification?.status === "pending") {
    const adj = modification.adjustment;
    async function cancel() {
      setPending(true);
      const res = await cancelModification(modification!.id);
      setPending(false);
      if (res.ok) {
        toast.success("Modificare anulată");
        router.refresh();
      } else {
        toast.error(res.error ?? "Nu am putut anula");
      }
    }
    return (
      <Card>
        <Group gap="xs" mb="xs">
          <PencilLine size={18} />
          <Text fw={700}>Modificare în așteptarea clientului</Text>
        </Group>
        <Group justify="space-between">
          <Badge color={adj > 0 ? "orange" : "teal"} variant="light">
            {adj > 0 ? "+" : "−"}
            {Math.abs(adj).toFixed(2)} RON
          </Badge>
          <Text fz="sm" c="dimmed">
            Total nou {modification.newTotal.toFixed(2)} RON
          </Text>
        </Group>
        {modification.reason && (
          <Text fz="sm" c="dimmed" mt={6}>
            {modification.reason}
          </Text>
        )}
        <Button variant="default" color="red" mt="md" fullWidth loading={pending} onClick={cancel}>
          Anulează propunerea
        </Button>
      </Card>
    );
  }

  // No live proposal — offer the form only while the order is still modifiable.
  if (!MODIFIABLE.includes(orderStatus)) return null;

  async function propose() {
    const adj = typeof amount === "number" ? amount : parseFloat(String(amount).replace(",", "."));
    if (!Number.isFinite(adj) || adj === 0) {
      toast.error("Introdu o sumă diferită de 0");
      return;
    }
    setPending(true);
    const res = await proposeModification(orderId, adj, reason);
    setPending(false);
    if (res.ok) {
      toast.success("Trimis spre aprobarea clientului");
      setAmount("");
      setReason("");
      router.refresh();
    } else {
      toast.error(res.error ?? "Nu am putut trimite modificarea");
    }
  }

  return (
    <Card>
      <Group gap="xs" mb="xs">
        <PencilLine size={18} />
        <Text fw={700}>Modifică comanda</Text>
      </Group>
      <Text fz="xs" c="dimmed" mb="sm">
        Sumă pozitivă = taxă suplimentară, negativă = reducere. Clientul trebuie să accepte; la o
        reducere a unei comenzi plătite online, diferența se rambursează automat.
      </Text>
      <Stack gap="sm">
        <NumberInput
          label="Ajustare (lei)"
          placeholder="ex. 15 sau −10"
          decimalScale={2}
          step={1}
          value={amount}
          onChange={setAmount}
        />
        <TextInput
          label="Motiv (opțional)"
          placeholder="ex. upgrade hârtie / produs indisponibil"
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
        />
        <Button loading={pending} onClick={propose}>
          Trimite spre aprobare
        </Button>
      </Stack>
    </Card>
  );
}
