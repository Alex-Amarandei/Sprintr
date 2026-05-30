"use client";

import { useState } from "react";
import { Button, Group } from "@mantine/core";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import type { OrderStatus } from "@/lib/design/status";
import { StatusBadge } from "@/components/ui/StatusBadge";

/**
 * Shop-side status + accept/reject/advance for an order detail header.
 * Local state only (presentational) — TODO(BE): persist via order update.
 */
export function ShopOrderActions({
  id,
  initialStatus,
}: {
  id: string;
  initialStatus: OrderStatus;
}) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);

  const set = (s: OrderStatus, msg: string) => {
    setStatus(s);
    toast.success(msg);
  };

  return (
    <Group gap="sm" wrap="nowrap" align="center">
      <StatusBadge status={status} />
      {status === "pending" && (
        <>
          <Button
            variant="default"
            leftSection={<X size={16} />}
            onClick={() => set("rejected", `Comanda #${id} respinsă`)}
          >
            Respinge
          </Button>
          <Button
            color="teal"
            leftSection={<Check size={16} />}
            onClick={() => set("accepted", `Comanda #${id} acceptată`)}
          >
            Acceptă
          </Button>
        </>
      )}
      {status === "accepted" && (
        <Button color="cyan" onClick={() => set("in_progress", `#${id} în pregătire`)}>
          Începe pregătirea
        </Button>
      )}
      {status === "in_progress" && (
        <Button color="teal" onClick={() => set("done", `#${id} finalizată`)}>
          Marchează gata
        </Button>
      )}
    </Group>
  );
}
