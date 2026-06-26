import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Anchor,
  Badge,
  Box,
  Card,
  Divider,
  Flex,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { ArrowLeft, Truck } from "lucide-react";
import { getOrderDetail, getOrderModification } from "@/lib/orders/queries";
import { courierStatusLabel } from "@/lib/delivery/types";
import { CustomerModificationCard } from "@/components/order/CustomerModificationCard";
import { getMyShopReview } from "@/lib/reviews/queries";
import { createClient } from "@/lib/supabase/server";
import { isCompletedStatus, isCustomerCancellable, isEtaActive, isTerminalStatus } from "@/lib/design/status";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { StatusTimeline } from "@/components/order/StatusTimeline";
import { EtaCountdown } from "@/components/order/EtaCountdown";
import { ChatPanel } from "@/components/order/ChatPanel";
import { ReviewForm } from "@/components/order/ReviewForm";
import { DownloadReceiptButton } from "@/components/order/DownloadReceiptButton";
import { ReorderButton } from "@/components/order/ReorderButton";
import { CancelOrderButton } from "@/components/order/CancelOrderButton";
import { DownloadButton } from "@/components/order/DownloadButton";
import { LinkAnchor } from "@/components/ui/links";

export const metadata: Metadata = { title: "Detalii comandă" };

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function OrderDetailPage({ params }: Props) {
  const { orderId } = await params;
  const order = await getOrderDetail(orderId);
  if (!order) notFound();
  const modification = await getOrderModification(orderId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const chatClosed = isTerminalStatus(order.status);

  // Post-purchase review is available once the order is done.
  const myReview =
    isCompletedStatus(order.status) ? await getMyShopReview(order.shopId) : null;

  const shortId = order.id.slice(0, 8);

  return (
    <Stack gap="lg">
      <LinkAnchor href="/orders" c="dimmed" fz="sm" underline="never">
        <Group gap={4} component="span">
          <ArrowLeft size={15} /> Toate comenzile
        </Group>
      </LinkAnchor>

      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        <div>
          <Group gap="sm" align="center">
            <Title order={2}>Comanda #{shortId}</Title>
            <StatusBadge status={order.status} />
          </Group>
          <Text c="dimmed" mt={4}>
            <LinkAnchor
              href={`/shop/${order.shopId}`}
              c="dimmed"
              fw={600}
              underline="hover"
            >
              {order.shopName}
            </LinkAnchor>
            {" · Plasată "}
            <RelativeTime iso={order.placedAtIso} fallback={order.placedAt} inherit />
            {" "}
            {isEtaActive(order.status) &&
              (order.etaAt ? (
                <>
                  {" · Estimat de completare: "}
                  <EtaCountdown at={order.etaAt} inherit fw={500} />
                </>
              ) : order.eta ? (
                ` · Estimat de completare: ${order.eta}`
              ) : (
                ""
              ))}
          </Text>
        </div>
        <Group gap="sm" wrap="wrap">
          {isCustomerCancellable(order.status) && (
            <CancelOrderButton
              orderId={order.id}
              paidOnline={!!order.online && order.paymentStatus === "paid"}
            />
          )}
          <ReorderButton orderId={order.id} />
          <DownloadReceiptButton
            orderId={order.id}
            enabled={isTerminalStatus(order.status)}
          />
        </Group>
      </Group>

      <Flex direction={{ base: "column", md: "row" }} align="flex-start" gap="lg">
        {/* Left: status + items */}
        <Stack gap="lg" style={{ flex: 1, minWidth: 0, width: "100%" }}>
          <Card>
            <Text fw={700} mb="md">
              Status comandă
            </Text>
            <StatusTimeline
              status={order.status}
              fulfilment={order.fulfilment}
              eta={order.eta}
              etaAt={order.etaAt}
            />
          </Card>

          {modification && modification.status === "pending" && (
            <CustomerModificationCard orderId={order.id} modification={modification} />
          )}

          <Card>
            <Text fw={700} mb="md">
              Produse comandate
            </Text>
            <Stack gap="md">
              {order.lines.map((line, i) => (
                <Box key={i}>
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <div>
                      <Group gap={6} wrap="nowrap">
                        <LinkAnchor
                          href={`/shop/${order.shopId}${line.itemId ? `#item-${line.itemId}` : ""}`}
                          fw={600}
                          fz="sm"
                          c={line.rejected ? "dimmed" : "var(--mantine-color-text)"}
                          td={line.rejected ? "line-through" : undefined}
                          underline="hover"
                        >
                          {line.title}
                        </LinkAnchor>
                        {line.rejected && (
                          <Badge size="xs" color="red" variant="light">
                            Indisponibil
                          </Badge>
                        )}
                      </Group>
                      <Text fz="xs" c="dimmed" mt={2}>
                        {line.summary}
                      </Text>
                      {line.files && line.files.length > 0 && (
                        <Stack gap={4} mt={6} align="flex-start">
                          {line.files.map((f, fi) => (
                            <DownloadButton
                              key={fi}
                              orderId={order.id}
                              fileName={f.name}
                              label={f.name}
                              variant="light"
                              color="brand"
                              size="compact-xs"
                            />
                          ))}
                        </Stack>
                      )}
                    </div>
                    <Text
                      fw={700}
                      fz="sm"
                      c={line.rejected ? "dimmed" : undefined}
                      td={line.rejected ? "line-through" : undefined}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {line.lineTotal.toFixed(2)} RON
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
                <Text fz="sm">{order.subtotal.toFixed(2)} RON</Text>
              </Group>
              {(order.discount ?? 0) > 0 && (
                <Group justify="space-between">
                  <Text fz="sm" c="dimmed">Reducere</Text>
                  <Text fz="sm" c="teal.7">−{(order.discount ?? 0).toFixed(2)} RON</Text>
                </Group>
              )}
              {(order.shippingFee ?? 0) > 0 && (
                <Group justify="space-between">
                  <Text fz="sm" c="dimmed">Livrare</Text>
                  <Text fz="sm">{(order.shippingFee ?? 0).toFixed(2)} RON</Text>
                </Group>
              )}
              <Group justify="space-between">
                <Text fz="sm" c="dimmed">Taxă serviciu</Text>
                <Text fz="sm">{(order.serviceFee ?? 0).toFixed(2)} RON</Text>
              </Group>
              {(order.adjustment ?? 0) !== 0 && (
                <Group justify="space-between">
                  <Text fz="sm" c="dimmed">Ajustare</Text>
                  <Text fz="sm" c={(order.adjustment ?? 0) > 0 ? "orange" : "teal.7"}>
                    {(order.adjustment ?? 0) > 0 ? "+" : "−"}
                    {Math.abs(order.adjustment ?? 0).toFixed(2)} RON
                  </Text>
                </Group>
              )}
              <Group justify="space-between" mt={4}>
                <Text fw={700}>Total</Text>
                <Text fw={800} fz="xl" c="var(--mantine-color-text)">
                  {order.total.toFixed(2)} RON
                </Text>
              </Group>
            </Stack>
          </Card>

          {order.courierProvider && (
            <Card>
              <Group justify="space-between" wrap="nowrap" gap="md">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <ThemeIcon variant="light" color="grape" size={40} radius="md">
                    <Truck size={18} />
                  </ThemeIcon>
                  <div style={{ minWidth: 0 }}>
                    <Text fw={700} fz="sm">
                      Curier
                    </Text>
                    <Text fz="sm" c="dimmed" truncate>
                      {order.courierName ?? "Curier Glovo"}
                      {courierStatusLabel(order.courierStatus)
                        ? ` · ${courierStatusLabel(order.courierStatus)}`
                        : ""}
                    </Text>
                  </div>
                </Group>
                <Group gap="sm" wrap="nowrap">
                  {order.courierPhone && (
                    <Anchor href={`tel:${order.courierPhone.replace(/\s+/g, "")}`} fz="sm" fw={600}>
                      Sună
                    </Anchor>
                  )}
                  {order.courierTrackingUrl && (
                    <Anchor href={order.courierTrackingUrl} target="_blank" rel="noopener noreferrer" fz="sm" fw={600}>
                      Urmărește
                    </Anchor>
                  )}
                </Group>
              </Group>
            </Card>
          )}

          {isCompletedStatus(order.status) && (
            <ReviewForm
              shopId={order.shopId}
              orderId={order.id}
              currentUserId={user?.id ?? ""}
              existing={myReview}
            />
          )}
        </Stack>

        {/* Chat — ONE instance only. Two ChatPanels here would open two identical
            postgres_changes subscriptions; Realtime dedups them server-side and routes
            events to just one, so the visible panel could receive nothing. */}
        <Box w={{ base: "100%", md: 380 }} style={{ flexShrink: 0 }}>
          <ChatPanel
            orderId={order.id}
            currentUserId={user?.id ?? ""}
            customerId={order.customerId}
            peerName={order.shopName}
            initialMessages={order.messages}
            complaintMessages={order.complaintMessages ?? []}
            orderClosed={chatClosed}
          />
        </Box>
      </Flex>
    </Stack>
  );
}
