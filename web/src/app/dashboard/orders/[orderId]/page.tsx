import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ActionIcon,
  Box,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  ThemeIcon,
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
import { StatusTimeline } from "@/components/order/StatusTimeline";
import { ChatPanel } from "@/components/order/ChatPanel";
import { ShopOrderActions } from "@/components/order/ShopOrderActions";
import { DownloadButton } from "@/components/order/DownloadButton";
import { LinkAnchor, LinkActionIcon } from "@/components/ui/links";

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
  value: string;
}) {
  return (
    <Group gap="sm" wrap="nowrap" align="flex-start">
      <ThemeIcon variant="light" color="mist" size={30} radius="md">
        {icon}
      </ThemeIcon>
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

  const shortId = order.id.slice(0, 8);
  // TODO(BE): uploaded files aren't persisted in order_items yet → no attachments.
  const files = order.lines.filter((l) => l.pdfName);

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
            value={`${order.customerName}${order.contactPhone ? ` · ${order.contactPhone}` : ""}`}
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
            <InfoRow icon={<FileText size={15} />} label="Plată" value={order.paymentMethod} />
          )}
        </Stack>
      </Card>

      <ChatPanel
        peerName={order.customerName}
        perspective="shop"
        initialMessages={order.messages}
        height={420}
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

      <Group align="flex-start" gap="lg" wrap="nowrap">
        {/* Left: status + products + files + notes */}
        <Stack gap="lg" style={{ flex: 1, minWidth: 0 }}>
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
                <Text fw={800} fz={20} c="ink.9">
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
                <DownloadButton label="Descarcă toate" />
              </Group>
              <Stack gap="sm">
                {files.map((f, i) => (
                  <Group key={i} justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                      <ThemeIcon variant="light" color="red" size={38} radius="md">
                        <FileText size={18} />
                      </ThemeIcon>
                      <div style={{ minWidth: 0 }}>
                        <Text fz="sm" fw={500} truncate>
                          {f.pdfName}
                        </Text>
                        <Text fz="xs" c="dimmed" truncate>
                          {f.title}
                        </Text>
                      </div>
                    </Group>
                    <DownloadButton fileName={f.pdfName} />
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
              <Text fz="sm" c="ink.9">
                {order.notes}
              </Text>
            </Card>
          )}
        </Stack>

        {/* Right: customer/delivery + chat (desktop) */}
        <Box w={360} visibleFrom="md" style={{ flexShrink: 0 }}>
          {sidebar}
        </Box>
      </Group>

      {/* Client + chat on mobile (below the main content) */}
      <Box hiddenFrom="md">{sidebar}</Box>
    </Stack>
  );
}
