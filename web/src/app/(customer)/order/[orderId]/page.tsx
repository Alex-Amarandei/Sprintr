import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Box,
  Card,
  Divider,
  Flex,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { ArrowLeft } from "lucide-react";
import { getOrderDetail } from "@/lib/orders/queries";
import { getMyShopReview } from "@/lib/reviews/queries";
import { createClient } from "@/lib/supabase/server";
import { isTerminalStatus } from "@/lib/design/status";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatusTimeline } from "@/components/order/StatusTimeline";
import { ChatPanel } from "@/components/order/ChatPanel";
import { ReviewForm } from "@/components/order/ReviewForm";
import { DownloadReceiptButton } from "@/components/order/DownloadReceiptButton";
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const chatClosed = order.status === "done" || order.status === "rejected";

  // Post-purchase review is available once the order is done.
  const myReview =
    order.status === "done" ? await getMyShopReview(order.shopId) : null;

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
            {order.shopName} · Plasată {order.placedAt}
            {order.eta ? ` · ETA ${order.eta}` : ""}
          </Text>
        </div>
        <DownloadReceiptButton
          orderId={order.id}
          enabled={isTerminalStatus(order.status)}
        />
      </Group>

      <Flex direction={{ base: "column", md: "row" }} align="flex-start" gap="lg">
        {/* Left: status + items */}
        <Stack gap="lg" style={{ flex: 1, minWidth: 0, width: "100%" }}>
          <Card>
            <Text fw={700} mb="md">
              Status comandă
            </Text>
            <StatusTimeline status={order.status} eta={order.eta} />
          </Card>

          <Card>
            <Text fw={700} mb="md">
              Produse comandate
            </Text>
            <Stack gap="md">
              {order.lines.map((line, i) => (
                <Box key={i}>
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <div>
                      <LinkAnchor
                        href={`/shop/${order.shopId}${line.itemId ? `#item-${line.itemId}` : ""}`}
                        fw={600}
                        fz="sm"
                        c="var(--mantine-color-text)"
                        underline="hover"
                      >
                        {line.title}
                      </LinkAnchor>
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
              {(order.discount ?? 0) > 0 && (
                <Group justify="space-between">
                  <Text fz="sm" c="dimmed">Reducere</Text>
                  <Text fz="sm" c="teal.7">−{(order.discount ?? 0).toFixed(2)} lei</Text>
                </Group>
              )}
              {(order.shippingFee ?? 0) > 0 && (
                <Group justify="space-between">
                  <Text fz="sm" c="dimmed">Livrare</Text>
                  <Text fz="sm">{(order.shippingFee ?? 0).toFixed(2)} lei</Text>
                </Group>
              )}
              <Group justify="space-between">
                <Text fz="sm" c="dimmed">Taxă serviciu</Text>
                <Text fz="sm">{(order.serviceFee ?? 0).toFixed(2)} lei</Text>
              </Group>
              <Group justify="space-between" mt={4}>
                <Text fw={700}>Total</Text>
                <Text fw={800} fz="xl" c="var(--mantine-color-text)">
                  {order.total.toFixed(2)} lei
                </Text>
              </Group>
            </Stack>
          </Card>

          {order.status === "done" && (
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
