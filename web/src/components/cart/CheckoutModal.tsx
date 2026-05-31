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
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Store,
  Truck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils/format";
import { phoneError, sanitizePhoneInput } from "@/lib/utils/validation";
import { useCart } from "./CartContext";
import { createClient } from "@/lib/supabase/client";
import { uploadOrderFiles } from "@/lib/storage/orderFiles";
import { confirmOrderPayment } from "@/lib/orders/payment";

// Only initialise Stripe when the publishable key is actually configured —
// `loadStripe(undefined)` throws, and the key is absent in local/dev without Stripe.
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

// ── Types ──────────────────────────────────────────────────────────────────────

interface PlaceOrderResult {
  order_id: string;
  total: number;
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

// Fixed platform service fee per order (matches the server's SERVICE_FEE; not shop-configurable).
const SERVICE_FEE = 2;

function DeliveryStep({
  total,
  deliveryFee,
  onNext,
  loading,
}: {
  total: number;
  deliveryFee: number;
  onNext: (values: DeliveryFormValues) => void;
  loading: boolean;
}) {
  const form = useForm<DeliveryFormValues>({
    initialValues: {
      fulfilment: "delivery",
      delivery_address: "",
      contact_phone: "",
      notes: "",
      // Delivery is the default fulfilment → must be paid online.
      payment_method: "online",
    },
    validate: {
      delivery_address: (v, values) =>
        values.fulfilment === "delivery" && !v.trim()
          ? "Adresa de livrare este obligatorie"
          : null,
      contact_phone: phoneError,
    },
  });

  const pickup = form.values.fulfilment === "pickup";

  return (
    <form onSubmit={form.onSubmit(onNext)}>
      <Stack gap="lg">
        {/* Fulfilment */}
        <Radio.Group
          label="Cum vrei să primești comanda?"
          value={form.values.fulfilment}
          onChange={(v) => {
            const f = v as DeliveryFormValues["fulfilment"];
            form.setFieldValue("fulfilment", f);
            // Delivery must be paid online; pickup defaults to paying at the store.
            form.setFieldValue("payment_method", f === "delivery" ? "online" : "cash_in_store");
          }}
        >
          <SimpleGrid cols={2} spacing="sm" mt="xs">
            <Radio.Card value="delivery" radius="md" p="md">
              <Group gap="sm" wrap="nowrap" align="flex-start">
                <Radio.Indicator />
                <div>
                  <Group gap={6}>
                    <Truck size={16} />
                    <Text fw={600} fz="sm">
                      Livrare la domiciliu
                    </Text>
                  </Group>
                  <Text fz="xs" c="dimmed" mt={2}>
                    Sub 60 de minute
                  </Text>
                </div>
              </Group>
            </Radio.Card>
            <Radio.Card value="pickup" radius="md" p="md">
              <Group gap="sm" wrap="nowrap" align="flex-start">
                <Radio.Indicator />
                <div>
                  <Group gap={6}>
                    <Store size={16} />
                    <Text fw={600} fz="sm">
                      Ridicare din magazin
                    </Text>
                  </Group>
                  <Text fz="xs" c="dimmed" mt={2}>
                    Gratuit
                  </Text>
                </div>
              </Group>
            </Radio.Card>
          </SimpleGrid>
        </Radio.Group>

        {!pickup && (
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
          inputMode="tel"
          {...form.getInputProps("contact_phone")}
          onChange={(e) =>
            form.setFieldValue("contact_phone", sanitizePhoneInput(e.target.value))
          }
        />

        <Textarea
          label="Mențiuni (opțional)"
          placeholder="Orice detaliu suplimentar pentru magazin…"
          autosize
          minRows={2}
          {...form.getInputProps("notes")}
        />

        <Divider />

        {/* Payment — delivery must be paid online; pickup can pay at the store. */}
        <Radio.Group label="Metodă de plată" {...form.getInputProps("payment_method")}>
          <Stack mt="xs" gap="sm">
            {pickup && (
              <Radio.Card value="cash_in_store" radius="md" p="sm">
                <Group gap="sm" wrap="nowrap">
                  <Radio.Indicator />
                  <Banknote size={18} />
                  <Text fw={600} fz="sm">
                    Numerar la magazin
                  </Text>
                </Group>
              </Radio.Card>
            )}
            <Radio.Card value="online" radius="md" p="sm">
              <Group gap="sm" wrap="nowrap">
                <Radio.Indicator />
                <CreditCard size={18} />
                <Text fw={600} fz="sm">
                  Card online (Stripe)
                </Text>
              </Group>
            </Radio.Card>
          </Stack>
          {!pickup && (
            <Text fz="xs" c="dimmed" mt="xs">
              Comenzile cu livrare se plătesc online.
            </Text>
          )}
        </Radio.Group>

        <Divider />

        {/* Money breakdown — delivery fee only applies to delivery; service fee is flat. */}
        <Stack gap={4}>
          <Group justify="space-between">
            <Text fz="sm" c="dimmed">Subtotal</Text>
            <Text fz="sm">{formatPrice(total)}</Text>
          </Group>
          {!pickup && (
            <Group justify="space-between">
              <Text fz="sm" c="dimmed">Livrare</Text>
              <Text fz="sm">
                {deliveryFee > 0 ? formatPrice(deliveryFee) : "Gratuit"}
              </Text>
            </Group>
          )}
          <Group justify="space-between">
            <Text fz="sm" c="dimmed">Taxă serviciu</Text>
            <Text fz="sm">{formatPrice(SERVICE_FEE)}</Text>
          </Group>
        </Stack>

        <Group justify="space-between" align="center">
          <div>
            <Text tt="uppercase" fz={10} fw={700} c="dimmed">
              Total
            </Text>
            <Text fz={22} fw={800} c="var(--mantine-color-text)" lh={1}>
              {formatPrice(total + (pickup ? 0 : deliveryFee) + SERVICE_FEE)}
            </Text>
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
  const { lines, shopId, total, deliveryFee, clear, payable } = useCart();
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

      // Upload each line's attached files to storage (user is authenticated here), then
      // freeze the { path, name } refs onto the order.
      const lineFiles = await Promise.all(lines.map((l) => uploadOrderFiles(l.files)));

      const payload = {
        shop_id: shopId,
        lines: lines.map((l, i) => ({
          itemId: l.itemId,
          title: l.title,
          kind: l.kind,
          answers: l.answers,
          clientTotal: l.total,
          files: lineFiles[i],
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

  async function handlePaymentSuccess() {
    // Mark the order paid now (verified against Stripe), so it surfaces to the shop
    // immediately even when the Stripe webhook isn't running. Idempotent vs the webhook.
    if (result?.order_id) {
      await confirmOrderPayment(result.order_id);
    }
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
      title={
        <Text fw={800} fz="lg" c="var(--mantine-color-text)">
          {titles[step]}
        </Text>
      }
      size="lg"
      padding="xl"
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
          total={payable}
          deliveryFee={deliveryFee}
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

