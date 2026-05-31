"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Group, NumberInput } from "@mantine/core";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { setOrderEta } from "@/lib/orders/actions";

/** Shop-side inline editor for an order's ETA (minutes). Visible to the customer once saved. */
export function OrderEtaEditor({ orderId, initial }: { orderId: string; initial: number | null }) {
  const router = useRouter();
  const [value, setValue] = useState<number | "">(initial ?? "");
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    const res = await setOrderEta(orderId, value === "" ? null : Number(value));
    setPending(false);
    if (res.ok) {
      toast.success("Timp estimat actualizat");
      router.refresh();
    } else {
      toast.error(res.error ?? "Nu am putut actualiza ETA");
    }
  }

  return (
    <Group gap="xs" wrap="nowrap" align="flex-end">
      <NumberInput
        label="Timp estimat (min)"
        leftSection={<Clock size={14} />}
        value={value}
        min={0}
        step={5}
        w={170}
        placeholder="ex. 30"
        onChange={(v) => setValue(v === "" || v == null ? "" : Number(v))}
      />
      <Button size="sm" variant="light" loading={pending} onClick={save}>
        Salvează
      </Button>
    </Group>
  );
}
