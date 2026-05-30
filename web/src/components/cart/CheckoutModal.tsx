"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Alert,
  Button,
  Divider,
  Group,
  Modal,
  Radio,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils/format";
import { useCart } from "./CartContext";
import { createClient } from "@/lib/supabase/client";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// ── Types ──────────────────────────────────────────────────────────────────────

interface PlaceOrderResult {
  order_id: string;
  total: number;
  platform_fee: number;
  client_secret: string | null;
}

// ── Step 1: Delivery details form ──────────────────────────────────────────────

interface DeliveryFormValues {
  fulfilment: "delivery" | "pickup";
  delivery_address: string;
  contact_phone: string;
  notes: string;
  payment_method: "cash_in_store" | "cash_on_delivery" | "online";
}

function DeliveryStep({
  total,
  onNext,
  loading,
}: {
  total: number;
  onNext: (values: DeliveryFormValues) => void;
  loading: boolean;
}) {
  const form = useForm<DeliveryFormValues>({
    initialValues: {
      fulfilment: "delivery",
      delivery_address: "",
      contact_phone: "",
      notes: "",
      payment_method: "cash_on_delivery",
    },
    validate: {
      delivery_address: (v, values) =>
        values.fulfilment === "delivery" && !v.trim()
          ? "Adresa de livrare este obligatorie"
          : null,
      contact_phone: (v) =>
        !v.trim() ? "Numărul de telefon este obligatoriu" : null,
    },
  });

  return (
    <form onSubmit={form.onSubmit(onNext)}>
      <Stack gap="md">
        <Radio.Group label="Metoda de ridicare" {...form.getInputProps("fulfilment")}>
          <Group mt="xs">
            <Radio value="delivery" label="Livrare la domiciliu" />
            <Radio value="pickup" label="Ridicare din magazin" />
          </Group>
        </Radio.Group>

        {form.values.fulfilment === "delivery" && (
          <TextInput
            label="Adresă de livrare"
            placeholder="Str. Lăpușneanu 12, Iași"
            required
            {...form.getInputProps("delivery_address")}
          />
        )}

        <TextInput
          label="Telefon de contact"
          placeholder="+40 7XX XXX XXX"
          required
          {...form.getInputProps("contact_phone")}
        />

        <Textarea
          label="Mențiuni (opțional)"
          placeholder="Orice detaliu suplimentar pentru magazin…"
          rows={2}
          {...form.getInputProps("notes")}
        />

        <Divider />

        <Radio.Group label="Metodă de plată" {...form.getInputProps("payment_method")}>
          <Stack mt="xs" gap="xs">
            {form.values.fulfilment !== "pickup" && (
              <Radio value="cash_on_delivery" label="Numerar la livrare" />
            )}
            <Radio value="cash_in_store" label="Numerar la magazin" />
            <Radio value="online" label="Card online (Stripe)" />
          </Stack>
        </Radio.Group>

        <Divider />

        <Group justify="space-between">
          <div>
            <Text size="sm" c="dimmed">Total comandă</Text>
            <Text fw={700} fz="xl" c="brand.7">{formatPrice(total)}</Text>
            <Text size="xs" c="dimmed">include taxă platformă 6%</Text>
          </div>
          <Button type="submit" size="md" loading={loading}>
            {form.values.payment_method === "online"
              ? "Continuă spre plată"
              : "Plasează comanda"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

// ── Step 2: Stripe card form ────────────────────────────────────────────────────

function StripePaymentStep({
  clientSecret,
  orderId,
  total,
  onSuccess,
}: {
  clientSecret: string;
  orderId: string;
  total: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders?paid=${orderId}`,
      },
      // Don't redirect — handle ourselves so we can show success in-modal
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Eroare la plată");
      setLoading(false);
    } else {
      // Payment succeeded without redirect (e.g. card that doesn't need 3DS)
      onSuccess();
    }
  }

  return (
    <form onSubmit={handlePay}>
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={600}>Total de plată</Text>
          <Text fw={700} fz="lg" c="brand.7">{formatPrice(total)}</Text>
        </Group>

        <PaymentElement />

        {error && (
          <Alert icon={<AlertCircle size={16} />} color="red">
            {error}
          </Alert>
        )}

        <Button type="submit" size="md" loading={loading} disabled={!stripe}>
          Plătește {formatPrice(total)}
        </Button>

        <Text size="xs" c="dimmed" ta="center">
          Plata procesată securizat de Stripe. Cardul nu este stocat pe serverele noastre.
        </Text>
      </Stack>
    </form>
  );
}

// ── Step 3: Success ─────────────────────────────────────────────────────────────

function SuccessStep({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const router = useRouter();

  return (
    <Stack align="center" gap="lg" py="lg">
      <CheckCircle2 size={56} color="var(--mantine-color-green-6)" />
      <Title order={3} ta="center">Comandă plasată cu succes!</Title>
      <Text c="dimmed" ta="center">
        Magazinul va confirma comanda în curând. Vei putea urmări statusul în secțiunea comenzi.
      </Text>
      <Group>
        <Button variant="light" onClick={onClose}>Continuă cumpărăturile</Button>
        <Button onClick={() => { onClose(); router.push(`/order/${orderId}`); }}>
          Vezi comanda
        </Button>
      </Group>
    </Stack>
  );
}

// ── Main CheckoutModal ──────────────────────────────────────────────────────────

interface CheckoutModalProps {
  opened: boolean;
  onClose: () => void;
}

type Step = "delivery" | "payment" | "success";

export function CheckoutModal({ opened, onClose }: CheckoutModalProps) {
  const { lines, shopId, total, clear } = useCart();
  const [step, setStep] = useState<Step>("delivery");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlaceOrderResult | null>(null);

  function handleClose() {
    // Don't allow closing mid-payment
    if (step === "payment") return;
    onClose();
    // Reset state after close animation
    setTimeout(() => {
      setStep("delivery");
      setError(null);
      setResult(null);
    }, 300);
  }

  async function handleDeliverySubmit(values: DeliveryFormValues) {
    if (!shopId) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const payload = {
        shop_id: shopId,
        lines: lines.map((l) => ({
          itemId: l.itemId,
          title: l.title,
          kind: l.kind,
          answers: l.answers,
          clientTotal: l.total,
          fileName: l.fileName,
        })),
        fulfilment: values.fulfilment,
        delivery_address: values.delivery_address || undefined,
        contact_phone: values.contact_phone,
        notes: values.notes || undefined,
        payment_method: values.payment_method,
      };

      const res = await fetch("/api/place-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Eroare la plasarea comenzii");
      }

      setResult(data as PlaceOrderResult);

      if (values.payment_method === "online" && data.client_secret) {
        setStep("payment");
      } else {
        // Cash order — done immediately
        clear();
        setStep("success");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setLoading(false);
    }
  }

  function handlePaymentSuccess() {
    clear();
    setStep("success");
  }

  const titles: Record<Step, string> = {
    delivery: "Finalizează comanda",
    payment: "Plată cu cardul",
    success: "Succes",
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={titles[step]}
      size="lg"
      centered
      closeOnClickOutside={step !== "payment"}
      closeOnEscape={step !== "payment"}
    >
      {error && (
        <Alert icon={<AlertCircle size={16} />} color="red" mb="md" onClose={() => setError(null)} withCloseButton>
          {error}
        </Alert>
      )}

      {step === "delivery" && (
        <DeliveryStep
          total={total * 1.06} // preview with fee — actual total comes from server
          onNext={handleDeliverySubmit}
          loading={loading}
        />
      )}

      {step === "payment" && result?.client_secret && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret: result.client_secret,
            appearance: { theme: "stripe" },
            locale: "ro",
          }}
        >
          <StripePaymentStep
            clientSecret={result.client_secret}
            orderId={result.order_id}
            total={result.total}
            onSuccess={handlePaymentSuccess}
          />
        </Elements>
      )}

      {step === "success" && result && (
        <SuccessStep orderId={result.order_id} onClose={() => { handleClose(); clear(); }} />
      )}
    </Modal>
  );
}

