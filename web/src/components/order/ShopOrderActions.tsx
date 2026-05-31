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
  fulfilment = "pickup",
}: {
  id: string;
  initialStatus: OrderStatus;
  fulfilment?: "delivery" | "pickup";
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
            // Theme-aware surface: keep the soft stone fill in light mode, but use the
            // dark raised-surface token in dark mode (a hardcoded light `stone.0` left
            // the default variant's light text unreadable on a near-white button).
            bg="light-dark(var(--mantine-color-stone-0), var(--mantine-color-dark-6))"
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
      {status === "in_progress" &&
        (fulfilment === "delivery" ? (
          <Button color="grape" loading={pending} onClick={() => set("in_delivery", `#${short(id)} trimisă la livrare`)}>
            Trimite la livrare
          </Button>
        ) : (
          <Button color="teal" loading={pending} onClick={() => set("done", `#${short(id)} finalizată`)}>
            Marchează gata
          </Button>
        ))}
      {status === "in_delivery" && (
        <Button color="teal" loading={pending} onClick={() => set("done", `#${short(id)} livrată`)}>
          Marchează livrată
        </Button>
      )}
    </Group>
  );
}
