"use client";

import { useState, useTransition } from "react";
import { Button, Group } from "@mantine/core";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import type { OrderStatus } from "@/lib/design/status";
import { advanceOrderStatus } from "@/lib/orders/actions";
import { StatusBadge } from "@/components/ui/StatusBadge";

const short = (id: string) => id.slice(0, 8);

/**
 * Shop-side status + accept/reject/advance for an order detail header.
 * Optimistic update + server persistence via the `advanceOrderStatus` action.
 */
export function ShopOrderActions({
  id,
  initialStatus,
}: {
  id: string;
  initialStatus: OrderStatus;
}) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [pending, startTransition] = useTransition();

  const set = (s: OrderStatus, msg: string) => {
    const prev = status;
    setStatus(s); // optimistic
    startTransition(async () => {
      const res = await advanceOrderStatus(id, s);
      if (res.ok) {
        toast.success(msg);
      } else {
        setStatus(prev); // rollback
        toast.error(res.error ?? "Nu am putut actualiza comanda");
      }
    });
  };

  return (
    <Group gap="sm" wrap="wrap" align="center">
      <StatusBadge status={status} />
      {status === "pending" && (
        <>
          <Button
            variant="default"
            leftSection={<X size={16} />}
            disabled={pending}
            onClick={() => set("rejected", `Comanda #${short(id)} respinsă`)}
          >
            Respinge
          </Button>
          <Button
            color="teal"
            leftSection={<Check size={16} />}
            loading={pending}
            onClick={() => set("accepted", `Comanda #${short(id)} acceptată`)}
          >
            Acceptă
          </Button>
        </>
      )}
      {status === "accepted" && (
        <Button color="cyan" loading={pending} onClick={() => set("in_progress", `#${short(id)} în pregătire`)}>
          Începe pregătirea
        </Button>
      )}
      {status === "in_progress" && (
        <Button color="teal" loading={pending} onClick={() => set("done", `#${short(id)} finalizată`)}>
          Marchează gata
        </Button>
      )}
    </Group>
  );
}
