"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Alert,
  Anchor,
  Button,
  Checkbox,
  Divider,
  Group,
  Loader,
  Modal,
  Radio,
  Select,
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
  LocateFixed,
  Store,
  Truck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils/format";
import { phoneError, sanitizePhoneInput } from "@/lib/utils/validation";
import { addAddress } from "@/lib/addresses/actions";
import {
  getCurrentPosition,
  reverseGeocode,
  haversineKm,
  MAX_DELIVERY_KM,
  type LatLng,
} from "@/lib/geo/geocode";
import { findNearbyShops, type NearbyShop } from "@/lib/shop/nearby";
import { quoteDelivery } from "@/lib/delivery/actions";
import { useCart } from "./CartContext";
import { createClient } from "@/lib/supabase/client";
import { uploadOrderFiles } from "@/lib/storage/orderFiles";

type SavedAddr = { id: string; label: string | null; address: string; lat: number | null; lng: number | null };
import { confirmOrderPayment } from "@/lib/orders/payment";

// The map picker is client-only (Leaflet touches `window`) → load it lazily, never on the server.
const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => (
    <Group
      justify="center"
      align="center"
      h={240}
      style={{
        border: "1px solid var(--mantine-color-default-border)",
        borderRadius: "var(--mantine-radius-md)",
      }}
    >
      <Loader size="sm" />
    </Group>
  ),
});

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
  /** Optional precise coordinates from the map/geolocation (helps the shop + courier). */
  delivery_lat: number | null;
  delivery_lng: number | null;
  contact_phone: string;
  notes: string;
  payment_method: "cash_in_store" | "cash_on_delivery" | "online";
  /** Optional promo code typed at checkout (validated server-side at placement). */
  code: string;
  /** Persist this address to the customer's address book on submit. */
  save_address: boolean;
}

// Fixed platform service fee per order (matches the server's SERVICE_FEE; not shop-configurable).
const SERVICE_FEE = 2;

function DeliveryStep({
  subtotal,
  discount,
  freeShipping,
  deliveryFee,
  shopId,
  shopLat,
  shopLng,
  onNext,
  loading,
}: {
  /** Pre-discount goods subtotal. */
  subtotal: number;
  /** Goods discount from live automatic offers. */
  discount: number;
  /** A free-shipping offer is in effect (waives the delivery fee). */
  freeShipping: boolean;
  deliveryFee: number;
  shopId: string;
  /** Shop coordinates — drive the delivery-radius check (null = shop hasn't set them). */
  shopLat: number | null;
  shopLng: number | null;
  onNext: (values: DeliveryFormValues) => void;
  loading: boolean;
}) {
  const form = useForm<DeliveryFormValues>({
    initialValues: {
      fulfilment: "delivery",
      delivery_address: "",
      delivery_lat: null,
      delivery_lng: null,
      contact_phone: "",
      notes: "",
      code: "",
      save_address: false,
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

  // Saved address book (own-RLS read). Picking one fills the address + coords; an opt-in
  // checkbox persists a newly typed address on submit.
  const [saved, setSaved] = useState<SavedAddr[]>([]);
  useEffect(() => {
    void (async () => {
      const { data } = await createClient()
        .from("addresses")
        .select("id, label, address, lat, lng")
        .order("is_default", { ascending: false });
      if (data) setSaved(data);
    })();
  }, []);

  // Save the typed address to the book (if opted in) before continuing.
  const submit = async (values: DeliveryFormValues) => {
    // Hard-block delivery outside the radius (the button is also disabled; Enter could bypass it).
    if (
      values.fulfilment === "delivery" &&
      values.delivery_lat != null &&
      values.delivery_lng != null &&
      shopLat != null &&
      shopLng != null &&
      haversineKm(
        { lat: values.delivery_lat, lng: values.delivery_lng },
        { lat: shopLat, lng: shopLng },
      ) > MAX_DELIVERY_KM
    ) {
      return;
    }
    if (values.fulfilment === "delivery" && values.save_address && values.delivery_address.trim()) {
      await addAddress({
        address: values.delivery_address,
        lat: values.delivery_lat,
        lng: values.delivery_lng,
        makeDefault: saved.length === 0,
      });
    }
    onNext(values);
  };

  // Live total preview, mirroring the server's authoritative reprice:
  //   total = (subtotal − discount) + shipping + service fee
  // Shipping applies only to delivery, and a free-shipping offer waives it.
  // When a courier provider (Glovo) is configured, its live quote for the chosen drop-off
  // replaces the shop's flat fee; otherwise we use the shop's own delivery_fee. `glovoFee` is
  // null until the quote returns (and whenever there's no provider). The server re-quotes
  // authoritatively at placement, so this is a preview.
  const [glovoFee, setGlovoFee] = useState<number | null>(null);
  const effectiveDeliveryFee = glovoFee ?? deliveryFee;
  const shipping = pickup || freeShipping ? 0 : effectiveDeliveryFee;
  const orderTotal =
    Math.round((subtotal - discount + shipping + SERVICE_FEE) * 100) / 100;

  const [locating, setLocating] = useState(false);

  // Fetch a live courier quote for the drop-off (gated to a configured provider; no-op otherwise).
  useEffect(() => {
    const { delivery_lat: lat, delivery_lng: lng } = form.values;
    if (pickup || lat == null || lng == null) {
      setGlovoFee(null);
      return;
    }
    let cancelled = false;
    quoteDelivery(shopId, lat, lng)
      .then((q) => !cancelled && setGlovoFee(q?.fee ?? null))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, form.values.delivery_lat, form.values.delivery_lng, shopId]);

  // Delivery radius: distance from the shop to the chosen drop-off. Only computed for delivery
  // when BOTH points are known — otherwise null (allowed); the server re-checks at placement.
  const distanceKm = useMemo(() => {
    const { delivery_lat: lat, delivery_lng: lng } = form.values;
    if (pickup || lat == null || lng == null || shopLat == null || shopLng == null) return null;
    return haversineKm({ lat, lng }, { lat: shopLat, lng: shopLng });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, form.values.delivery_lat, form.values.delivery_lng, shopLat, shopLng]);
  const tooFar = distanceKm != null && distanceKm > MAX_DELIVERY_KM;

  // When the shop is too far, suggest closer shops within range of the drop-off.
  const [nearby, setNearby] = useState<NearbyShop[]>([]);
  useEffect(() => {
    const { delivery_lat: lat, delivery_lng: lng } = form.values;
    if (!tooFar || lat == null || lng == null) {
      setNearby([]);
      return;
    }
    let cancelled = false;
    findNearbyShops(lat, lng, shopId)
      .then((r) => !cancelled && setNearby(r))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tooFar, shopId]);

  // Apply a chosen point: store coords + best-effort reverse-geocode into the address field.
  // `setValues` (not two `setFieldValue`s) so a click/drag updates everything in one render.
  async function applyPoint(p: LatLng) {
    form.setValues({ delivery_lat: p.lat, delivery_lng: p.lng });
    const addr = await reverseGeocode(p);
    if (addr) form.setFieldValue("delivery_address", addr);
  }

  async function useCurrentLocation() {
    setLocating(true);
    const p = await getCurrentPosition();
    setLocating(false);
    if (!p) {
      toast.error("Nu am putut accesa locația. Verifică permisiunile browserului.");
      return;
    }
    await applyPoint(p);
  }

  // On open, try to prefill the address from the current location — only when delivery is
  // selected and the address is still empty (per the request). Silent if permission is
  // denied/unavailable; the user can always type or pick on the map instead.
  const autoTried = useRef(false);
  useEffect(() => {
    if (autoTried.current) return;
    autoTried.current = true;
    if (form.values.fulfilment !== "delivery" || form.values.delivery_address.trim()) return;
    void (async () => {
      const p = await getCurrentPosition();
      if (!p || form.values.delivery_address.trim()) return; // bail if the user typed meanwhile
      await applyPoint(p);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <form onSubmit={form.onSubmit(submit)}>
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
          <Stack gap="xs">
            {saved.length > 0 && (
              <Select
                label="Adresă salvată"
                placeholder="Alege o adresă salvată…"
                clearable
                data={saved.map((a) => ({ value: a.id, label: a.label ? `${a.label} — ${a.address}` : a.address }))}
                onChange={(id) => {
                  const a = saved.find((s) => s.id === id);
                  if (!a) return;
                  form.setFieldValue("delivery_address", a.address);
                  form.setFieldValue("delivery_lat", a.lat);
                  form.setFieldValue("delivery_lng", a.lng);
                }}
              />
            )}
            <TextInput
              label="Adresă de livrare"
              placeholder="Str. Lăpușneanu 12, Iași"
              required
              {...form.getInputProps("delivery_address")}
            />
            <Checkbox
              label="Salvează această adresă pentru data viitoare"
              {...form.getInputProps("save_address", { type: "checkbox" })}
            />
            <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
              <Text fz="xs" c="dimmed">
                Alege punctul pe hartă sau folosește locația curentă — ajută magazinul și curierul.
              </Text>
              <Button
                size="xs"
                variant="light"
                leftSection={<LocateFixed size={14} />}
                loading={locating}
                onClick={useCurrentLocation}
                style={{ flexShrink: 0 }}
              >
                Locația curentă
              </Button>
            </Group>
            <LocationPicker
              value={
                form.values.delivery_lat != null && form.values.delivery_lng != null
                  ? { lat: form.values.delivery_lat, lng: form.values.delivery_lng }
                  : null
              }
              onPick={applyPoint}
            />

            {tooFar && (
              <Alert color="red" icon={<AlertCircle size={18} />} title="Magazinul nu livrează în zona ta">
                <Stack gap={6}>
                  <Text fz="sm">
                    Acest magazin este la ~{distanceKm!.toFixed(1)} km de adresa ta și livrează
                    doar în raza de {MAX_DELIVERY_KM} km. Alege un magazin mai aproape de tine.
                  </Text>
                  {nearby.length > 0 && (
                    <div>
                      <Text fz="xs" fw={700} c="dimmed" mb={2}>
                        Magazine mai apropiate:
                      </Text>
                      <Stack gap={2}>
                        {nearby.map((s) => (
                          <Anchor key={s.id} href={`/shop/${s.id}`} fz="sm" fw={500}>
                            {s.name} · {s.distanceKm} km
                          </Anchor>
                        ))}
                      </Stack>
                    </div>
                  )}
                </Stack>
              </Alert>
            )}
          </Stack>
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

        <TextInput
          label="Cod promoțional (opțional)"
          placeholder="ex. STUDENT10"
          {...form.getInputProps("code")}
          onChange={(e) => form.setFieldValue("code", e.currentTarget.value.toUpperCase())}
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

        {/* Money breakdown — subtotal, discount, then fees. Mirrors the server's reprice. */}
        <Stack gap={4}>
          <Group justify="space-between">
            <Text fz="sm" c="dimmed">Subtotal</Text>
            <Text fz="sm">{formatPrice(subtotal)}</Text>
          </Group>
          {discount > 0 && (
            <Group justify="space-between">
              <Text fz="sm" c="brand" fw={600}>Reducere</Text>
              <Text fz="sm" c="brand" fw={600}>−{formatPrice(discount)}</Text>
            </Group>
          )}
          {!pickup && (
            <Group justify="space-between">
              <Text fz="sm" c="dimmed">{glovoFee != null ? "Livrare (Glovo)" : "Livrare"}</Text>
              <Text
                fz="sm"
                c={shipping === 0 ? "brand" : undefined}
                fw={shipping === 0 ? 600 : undefined}
              >
                {shipping > 0 ? formatPrice(shipping) : "Gratuit"}
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
              {formatPrice(orderTotal)}
            </Text>
          </div>
          <Button type="submit" size="md" loading={loading} disabled={tooFar}>
            {tooFar
              ? "În afara zonei de livrare"
              : form.values.payment_method === "online"
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
  onCancel,
}: {
  clientSecret: string;
  orderId: string;
  total: number;
  onSuccess: () => void;
  onCancel: () => void;
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

        {/* Back out of payment (disabled only while a charge is actually in flight). */}
        <Button variant="subtle" color="gray" onClick={onCancel} disabled={loading}>
          Renunță
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
  const { lines, shopId, total, discount, freeShipping, deliveryFee, shopLat, shopLng, clear } =
    useCart();
  const [step, setStep] = useState<Step>("delivery");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlaceOrderResult | null>(null);

  function handleClose() {
    // Closable at every step (incl. payment) — the customer can back out of the card form.
    // The order was already created as "pending/unpaid"; closing just abandons payment, and the
    // cart is kept so they can retry. (Click-outside stays disabled on the payment step below so
    // a stray click doesn't dismiss the card form mid-entry.)
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
        delivery_lat: values.delivery_lat ?? undefined,
        delivery_lng: values.delivery_lng ?? undefined,
        contact_phone: values.contact_phone,
        notes: values.notes || undefined,
        payment_method: values.payment_method,
        code: values.code.trim() || undefined,
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
      closeOnEscape
      styles={{
        // Solid surface — the modal was reading semi-transparent over the page.
        content: { backgroundColor: "light-dark(#ffffff, var(--mantine-color-dark-7))" },
        header: { backgroundColor: "light-dark(#ffffff, var(--mantine-color-dark-7))" },
      }}
    >
      {error && (
        <Alert icon={<AlertCircle size={16} />} color="red" mb="md" onClose={() => setError(null)} withCloseButton>
          {error}
        </Alert>
      )}

      {step === "delivery" && (
        <DeliveryStep
          subtotal={total}
          discount={discount}
          freeShipping={freeShipping}
          deliveryFee={deliveryFee}
          shopId={shopId ?? ""}
          shopLat={shopLat}
          shopLng={shopLng}
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
            onCancel={handleClose}
          />
        </Elements>
      )}

      {step === "success" && result && (
        <SuccessStep orderId={result.order_id} onClose={() => { handleClose(); clear(); }} />
      )}
    </Modal>
  );
}

