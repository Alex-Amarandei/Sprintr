"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Alert, Button, Card, Divider, Group, Stack, Text } from "@mantine/core";
import { AlertCircle, Check, PencilLine, X } from "lucide-react";
import { toast } from "sonner";
import { confirmModificationPayment, respondToModification } from "@/lib/orders/modifications";
import type { OrderModificationView } from "@/lib/orders/queries";

const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = pk ? loadStripe(pk) : null;

/**
 * Customer-facing pending-modification card: shows the shop's proposed change and lets the customer
 * accept or decline. An online extra charge returns a delta PaymentIntent → the customer confirms it
 * with a card here; a reduction / cash change finalizes immediately on the server.
 */
export function CustomerModificationCard({
  orderId,
  modification,
}: {
  orderId: string;
  modification: OrderModificationView;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  if (modification.status !== "pending") return null;

  const adj = modification.adjustment;
  const extra = adj > 0;

  async function accept() {
    setPending(true);
    const res = await respondToModification(modification.id, true);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error ?? "Nu am putut accepta modificarea");
      return;
    }
    // Online extra charge → confirm the delta payment with a card before it applies.
    if (res.clientSecret) {
      setClientSecret(res.clientSecret);
      return;
    }
    toast.success("Modificare acceptată");
    router.refresh();
  }

  async function decline() {
    setPending(true);
    const res = await respondToModification(modification.id, false);
    setPending(false);
    if (res.ok) {
      toast.success("Modificare refuzată");
      router.refresh();
    } else {
      toast.error(res.error ?? "Nu am putut refuza modificarea");
    }
  }

  return (
    <Card withBorder style={{ borderColor: "var(--mantine-color-brand-5)" }}>
      <Group gap="xs" mb="xs">
        <PencilLine size={18} color="var(--mantine-color-brand-6)" />
        <Text fw={700}>Magazinul a propus o modificare</Text>
      </Group>
      {modification.reason && (
        <Text fz="sm" c="dimmed" mb="sm">
          {modification.reason}
        </Text>
      )}

      <Group justify="space-between">
        <Text fz="sm" c="dimmed">
          Total actual
        </Text>
        <Text fz="sm" td="line-through" c="dimmed">
          {modification.previousTotal.toFixed(2)} RON
        </Text>
      </Group>
      <Group justify="space-between">
        <Text fz="sm" c={extra ? "orange" : "teal.7"} fw={600}>
          {extra ? "Taxă suplimentară" : "Reducere"}
        </Text>
        <Text fz="sm" c={extra ? "orange" : "teal.7"} fw={600}>
          {extra ? "+" : "−"}
          {Math.abs(adj).toFixed(2)} RON
        </Text>
      </Group>
      <Divider my="xs" />
      <Group justify="space-between" mb="md">
        <Text fw={700}>Total nou</Text>
        <Text fw={800} fz="lg">
          {modification.newTotal.toFixed(2)} RON
        </Text>
      </Group>

      {clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
          <DeltaPay modId={modification.id} amount={adj} onDone={() => router.refresh()} />
        </Elements>
      ) : (
        <Group grow>
          <Button variant="default" leftSection={<X size={16} />} disabled={pending} onClick={decline}>
            Refuză
          </Button>
          <Button color="teal" leftSection={<Check size={16} />} loading={pending} onClick={accept}>
            Acceptă
          </Button>
        </Group>
      )}
    </Card>
  );
}

/** Confirms the delta PaymentIntent for an online extra charge, then finalizes server-side. */
function DeltaPay({
  modId,
  amount,
  onDone,
}: {
  modId: string;
  amount: number;
  onDone: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    if (stripeError) {
      setError(stripeError.message ?? "Eroare la plată");
      setLoading(false);
      return;
    }
    // Verify + apply server-side (the webhook also finalizes; this is the instant path).
    const res = await confirmModificationPayment(modId);
    setLoading(false);
    if (res.ok && res.paid) {
      toast.success("Plată reușită — modificare aplicată");
      onDone();
    } else {
      setError(res.error ?? "Plata nu a fost confirmată încă. Reîncarcă pagina.");
    }
  }

  return (
    <form onSubmit={pay}>
      <Stack gap="sm">
        <Text fz="sm" fw={600}>
          Plătește diferența de {amount.toFixed(2)} RON
        </Text>
        <PaymentElement />
        {error && (
          <Alert icon={<AlertCircle size={16} />} color="red">
            {error}
          </Alert>
        )}
        <Button type="submit" loading={loading} disabled={!stripe}>
          Plătește {amount.toFixed(2)} RON
        </Button>
      </Stack>
    </form>
  );
}
