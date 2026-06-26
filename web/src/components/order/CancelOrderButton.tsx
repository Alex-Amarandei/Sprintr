"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { XCircle } from "lucide-react";
import { toast } from "sonner";
import { cancelOrder } from "@/lib/orders/actions";

/**
 * Customer "cancel order" — only rendered while the order is still cancellable (pending/accepted).
 * Confirms first, then cancels; a paid online order is auto-refunded server-side.
 */
export function CancelOrderButton({
  orderId,
  paidOnline,
}: {
  orderId: string;
  paidOnline: boolean;
}) {
  const router = useRouter();
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    const res = await cancelOrder(orderId);
    setLoading(false);
    if (res.ok) {
      toast.success(
        paidOnline
          ? "Comanda a fost anulată. Suma plătită se returnează."
          : "Comanda a fost anulată.",
      );
      setOpened(false);
      router.refresh();
    } else {
      toast.error(res.error ?? "Nu am putut anula comanda.");
    }
  }

  return (
    <>
      <Button
        variant="default"
        color="red"
        leftSection={<XCircle size={16} />}
        onClick={() => setOpened(true)}
      >
        Anulează comanda
      </Button>
      <Modal opened={opened} onClose={() => setOpened(false)} title="Anulează comanda" centered>
        <Stack>
          <Text size="sm">
            Sigur vrei să anulezi această comandă?
            {paidOnline ? " Suma plătită îți va fi returnată automat." : ""}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOpened(false)}>
              Înapoi
            </Button>
            <Button color="red" loading={loading} onClick={confirm}>
              Da, anulează
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
