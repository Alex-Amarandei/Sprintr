import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ActionIcon,
  Anchor,
  Box,
  Card,
  Divider,
  Flex,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  Phone,
  Store,
  Truck,
} from "lucide-react";
import { getOrderDetail, getShopOrders } from "@/lib/orders/queries";
import { createClient } from "@/lib/supabase/server";
import { StatusTimeline } from "@/components/order/StatusTimeline";
import { ChatPanel } from "@/components/order/ChatPanel";
import { ShopOrderActions } from "@/components/order/ShopOrderActions";
import { DownloadButton } from "@/components/order/DownloadButton";
import { LinkAnchor, LinkActionIcon } from "@/components/ui/links";
import { TintIcon } from "@/components/ui/TintIcon";

export const metadata: Metadata = { title: "Detalii comandă" };

interface Props {
  params: Promise<{ orderId: string }>;
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Group gap="sm" wrap="nowrap" align="flex-start">
      <TintIcon color="mist" size={30} radius="md">
        {icon}
      </TintIcon>
      <div>
        <Text fz="xs" c="dimmed">
          {label}
        </Text>
        <Text fz="sm" fw={500}>
          {value}
        </Text>
      </div>
    </Group>
  );
}

export default async function ShopOrderDetailPage({ params }: Props) {
  const { orderId } = await params;
  const [order, queue] = await Promise.all([getOrderDetail(orderId), getShopOrders()]);
  if (!order) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const chatClosed = order.status === "done" || order.status === "rejected";

  const shortId = order.id.slice(0, 8);
  // Flatten every line's attached files into one list (a line may carry several).
  const files = order.lines.flatMap((l) =>
    (l.files ?? []).map((f) => ({ name: f.name, title: l.title })),
  );

  // Prev/next order navigation (by position in the queue).
  const idx = queue.findIndex((o) => o.id === order.id);
  const prev = idx > 0 ? queue[idx - 1] : null;
  const next = idx >= 0 && idx < queue.length - 1 ? queue[idx + 1] : null;

  // Client + chat — shown in a desktop sidebar and stacked below on mobile.
  const sidebar = (
    <Stack gap="lg">
      <Card>
        <Text fw={700} mb="md">
          Client & livrare
        </Text>
        <Stack gap="md">
          <InfoRow
            icon={<Phone size={15} />}
            label="Contact"
            value={
              <>
                {order.customerName}
                {order.contactPhone && (
                  <>
                    {" · "}
                    <Anchor
                      href={`tel:${order.contactPhone.replace(/\s+/g, "")}`}
                      inherit
                    >
                      {order.contactPhone}
                    </Anchor>
                  </>
                )}
              </>
            }
          />
          <InfoRow
            icon={order.fulfilment === "pickup" ? <Store size={15} /> : <Truck size={15} />}
            label="Livrare"
            value={order.fulfilment === "pickup" ? "Ridicare din magazin" : "Livrare la domiciliu"}
          />
          {order.fulfilment !== "pickup" && order.deliveryAddress && (
            <InfoRow icon={<MapPin size={15} />} label="Adresă" value={order.deliveryAddress} />
          )}
          {order.paymentMethod && (
            <InfoRow
              icon={<FileText size={15} />}
              label="Plată"
              value={
                order.paymentStatus === "paid"
                  ? `${order.paymentMethod} · Plătită`
                  : order.online
                    ? `${order.paymentMethod} · Neplătită`
                    : order.paymentMethod
              }
            />
          )}
        </Stack>
      </Card>

      <ChatPanel
        orderId={order.id}
        currentUserId={user?.id ?? ""}
        customerId={order.customerId}
        peerName={order.customerName}
        perspective="shop"
        initialMessages={order.messages}
        complaintMessages={order.complaintMessages ?? []}
        height={420}
        orderClosed={chatClosed}
      />
    </Stack>
  );

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <LinkAnchor href="/dashboard/orders" c="dimmed" fz="sm" underline="never">
          <Group gap={4} component="span">
            <ArrowLeft size={15} /> Toate comenzile
          </Group>
        </LinkAnchor>
        <Group gap="xs">
          {prev ? (
            <LinkActionIcon
              href={`/dashboard/orders/${prev.id}`}
              variant="default"
              size="lg"
              aria-label="Comanda anterioară"
            >
              <ChevronLeft size={18} />
            </LinkActionIcon>
          ) : (
            <ActionIcon variant="default" size="lg" disabled aria-label="Comanda anterioară">
              <ChevronLeft size={18} />
            </ActionIcon>
          )}
          {next ? (
            <LinkActionIcon
              href={`/dashboard/orders/${next.id}`}
              variant="default"
              size="lg"
              aria-label="Comanda următoare"
            >
              <ChevronRight size={18} />
            </LinkActionIcon>
          ) : (
            <ActionIcon variant="default" size="lg" disabled aria-label="Comanda următoare">
              <ChevronRight size={18} />
            </ActionIcon>
          )}
        </Group>
      </Group>

      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        <div>
          <Title order={2}>Comanda #{shortId}</Title>
          <Text c="dimmed" mt={4}>
            {order.customerName} · Plasată {order.placedAt}
            {order.eta ? ` · ETA ${order.eta}` : ""}
          </Text>
        </div>
        <ShopOrderActions id={order.id} initialStatus={order.status} />
      </Group>

      <Flex direction={{ base: "column", md: "row" }} align="flex-start" gap="lg">
        {/* Left: status + products + files + notes */}
        <Stack gap="lg" style={{ flex: 1, minWidth: 0, width: "100%" }}>
          <Card>
            <Text fw={700} mb="md">
              Status comandă
            </Text>
            <StatusTimeline status={order.status} eta={order.eta} />
          </Card>

          <Card>
            <Text fw={700} mb="md">
              Produse & configurație
            </Text>
            <Stack gap="md">
              {order.lines.map((line, i) => (
                <Box key={i}>
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <div>
                      <Text fw={600} fz="sm">
                        {line.title}
                      </Text>
                      <Text fz="xs" c="dimmed" mt={2}>
                        {line.summary}
                      </Text>
                    </div>
                    <Text fw={700} fz="sm" style={{ whiteSpace: "nowrap" }}>
                      {line.lineTotal.toFixed(2)} lei
                    </Text>
                  </Group>
                  {i < order.lines.length - 1 && <Divider mt="md" />}
                </Box>
              ))}
            </Stack>
            <Divider my="md" />
            <Stack gap={4}>
              <Group justify="space-between">
                <Text fz="sm" c="dimmed">Subtotal</Text>
                <Text fz="sm">{order.subtotal.toFixed(2)} lei</Text>
              </Group>
              <Group justify="space-between">
                <Text fz="sm" c="dimmed">Livrare</Text>
                <Text fz="sm">{order.delivery.toFixed(2)} lei</Text>
              </Group>
              <Group justify="space-between" mt={4}>
                <Text fw={700}>Total</Text>
                <Text fw={800} fz={20} c="var(--mantine-color-text)">
                  {order.total.toFixed(2)} lei
                </Text>
              </Group>
            </Stack>
          </Card>

          {/* Files */}
          {files.length > 0 && (
            <Card>
              <Group justify="space-between" mb="md">
                <Text fw={700}>Fișiere atașate</Text>
                <DownloadButton orderId={order.id} label="Descarcă toate" />
              </Group>
              <Stack gap="sm">
                {files.map((f, i) => (
                  <Group key={i} justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                      <TintIcon color="red" size={38} radius="md">
                        <FileText size={18} />
                      </TintIcon>
                      <div style={{ minWidth: 0 }}>
                        <Text fz="sm" fw={500} truncate>
                          {f.name}
                        </Text>
                        <Text fz="xs" c="dimmed" truncate>
                          {f.title}
                        </Text>
                      </div>
                    </Group>
                    <DownloadButton orderId={order.id} fileName={f.name} label="" />
                  </Group>
                ))}
              </Stack>
            </Card>
          )}

          {/* Customer notes */}
          {order.notes && (
            <Card>
              <Text fw={700} mb="xs">
                Note de la client
              </Text>
              <Text fz="sm" c="var(--mantine-color-text)">
                {order.notes}
              </Text>
            </Card>
          )}
        </Stack>

        {/* Right (desktop) / below (mobile): customer/delivery + chat. ONE instance only —
            two would open two identical postgres_changes subscriptions and Realtime would
            route events to just one, so the visible chat could receive nothing. */}
        <Box w={{ base: "100%", md: 360 }} style={{ flexShrink: 0 }}>
          {sidebar}
        </Box>
      </Flex>
    </Stack>
  );
}
