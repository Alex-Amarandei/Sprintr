"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Flex,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ShopConversation } from "@/lib/messages/queries";
import type { OrderStatus } from "@/lib/design/status";
import type { SampleMessage } from "@/lib/orders/sample";
import { ChatPanel } from "@/components/order/ChatPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useUnread } from "./UnreadProvider";

const timeOnly = (iso: string) =>
  new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const initials = (n: string) =>
  n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const short = (id: string) => id.slice(0, 8);
const chatClosed = (s: OrderStatus) => s === "done" || s === "rejected";

export function MessagesInbox({
  conversations: initial,
  currentUserId,
}: {
  conversations: ShopConversation[];
  currentUserId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { count, markRead } = useUnread();

  const [conversations, setConversations] = useState(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SampleMessage[] | null>(null);
  const [complaintMessages, setComplaintMessages] = useState<SampleMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Adopt fresh server data when the page re-fetches.
  useEffect(() => {
    setConversations(initial);
  }, [initial]);

  // Keep the list live: when the unread count changes (a new message arrived, via the
  // UnreadProvider's subscription), re-fetch the conversation list. Skips the first run.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    router.refresh();
  }, [count, router]);

  // While viewing a thread, mark it read as new messages arrive so the dot won't count them.
  const handleIncoming = useCallback(() => {
    if (selectedId) void markRead(selectedId);
  }, [selectedId, markRead]);

  const selected = conversations.find((c) => c.orderId === selectedId) ?? null;

  async function openConversation(c: ShopConversation) {
    setSelectedId(c.orderId);
    setMessages(null);
    setComplaintMessages([]);
    setLoading(true);
    // Optimistically clear this thread's unread; markRead persists + updates the dot.
    setConversations((prev) =>
      prev.map((x) => (x.orderId === c.orderId ? { ...x, unread: 0 } : x))
    );
    void markRead(c.orderId);

    const { data } = await supabase
      .from("messages")
      .select("sender_id, body, created_at, kind")
      .eq("order_id", c.orderId)
      .order("created_at", { ascending: true });
    const toMsg = (m: {
      sender_id: string;
      body: string;
      created_at: string;
    }): SampleMessage => ({
      from: m.sender_id === c.customerId ? "customer" : "shop",
      body: m.body,
      at: timeOnly(m.created_at),
    });
    setMessages((data ?? []).filter((m) => m.kind !== "complaint").map(toMsg));
    setComplaintMessages((data ?? []).filter((m) => m.kind === "complaint").map(toMsg));
    setLoading(false);
  }

  return (
    <Stack gap="lg">
      <Title order={2}>Mesaje</Title>

      <Flex gap="md" align="stretch" style={{ minHeight: 580 }}>
        {/* Conversation list (full width on mobile until one is opened) */}
        <Box
          w={{ base: "100%", md: 340 }}
          display={{ base: selected ? "none" : "block", md: "block" }}
          style={{ flexShrink: 0 }}
        >
          <Paper withBorder radius="lg" style={{ overflow: "hidden" }}>
            {conversations.length === 0 ? (
              <EmptyState
                icon={<MessageSquare size={26} />}
                title="Niciun mesaj"
                description="Conversațiile cu clienții vor apărea aici."
              />
            ) : (
              <Stack gap={0}>
                {conversations.map((c) => {
                  const active = c.orderId === selectedId;
                  return (
                    <Box
                      key={c.orderId}
                      p="md"
                      onClick={() => openConversation(c)}
                      style={{
                        cursor: "pointer",
                        borderBottom: "1px solid var(--mantine-color-default-border)",
                        background: active ? "var(--mantine-color-default-hover)" : undefined,
                      }}
                    >
                      <Group justify="space-between" wrap="nowrap" gap="sm">
                        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                          <Avatar
                            radius="xl"
                            size={40}
                            style={
                              {
                                "--avatar-bg": "var(--mantine-color-brand-1)",
                                "--avatar-color": "var(--mantine-color-brand-7)",
                              } as React.CSSProperties
                            }
                          >
                            {initials(c.customerName)}
                          </Avatar>
                          <div style={{ minWidth: 0 }}>
                            {/* Order reference + status first, then the customer name. */}
                            <Group gap={6} wrap="nowrap" mb={2}>
                              <Text fw={700} fz="xs" truncate>
                                #{short(c.orderId)}
                              </Text>
                              <StatusBadge status={c.status} size="xs" style={{ flexShrink: 0 }} />
                            </Group>
                            <Text fw={600} fz="sm" truncate>
                              {c.customerName}
                            </Text>
                            <Text fz="xs" c={c.unread > 0 ? "var(--mantine-color-text)" : "dimmed"} truncate fw={c.unread > 0 ? 600 : 400}>
                              {c.lastFromCustomer ? "" : "Tu: "}
                              {c.lastBody}
                            </Text>
                          </div>
                        </Group>
                        <Stack gap={6} align="flex-end" style={{ flexShrink: 0 }}>
                          <Text fz={10} c="dimmed">
                            {timeOnly(c.lastAtIso)}
                          </Text>
                          {c.unread > 0 && (
                            <Badge size="sm" circle variant="filled" color="brand.5" c="white">
                              {c.unread > 9 ? "9+" : c.unread}
                            </Badge>
                          )}
                        </Stack>
                      </Group>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Box>

        {/* Chat pane (full width on mobile once a conversation is opened) */}
        <Box
          flex={1}
          display={{ base: selected ? "block" : "none", md: "block" }}
          style={{ minWidth: 0 }}
        >
          {!selected ? (
            <Paper
              withBorder
              radius="lg"
              h="100%"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 580 }}
            >
              <EmptyState
                icon={<MessageSquare size={26} />}
                title="Selectează o conversație"
                description="Alege un client din listă pentru a vedea mesajele."
              />
            </Paper>
          ) : (
            <Stack gap="sm">
              <Group gap="sm" hiddenFrom="md" wrap="nowrap">
                <ActionIcon variant="subtle" color="gray" onClick={() => setSelectedId(null)} aria-label="Înapoi la listă">
                  <ArrowLeft size={18} />
                </ActionIcon>
                <Text fw={700} fz="sm" style={{ whiteSpace: "nowrap" }}>
                  #{short(selected.orderId)}
                </Text>
                <StatusBadge status={selected.status} size="xs" />
                <Text fw={600} fz="sm" truncate>
                  {selected.customerName}
                </Text>
              </Group>
              {loading || messages === null ? (
                <Paper withBorder radius="lg" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 560 }}>
                  <Loader />
                </Paper>
              ) : (
                <ChatPanel
                  key={selected.orderId}
                  orderId={selected.orderId}
                  currentUserId={currentUserId}
                  customerId={selected.customerId}
                  peerName={selected.customerName}
                  orderRef={`#${short(selected.orderId)}`}
                  orderStatus={selected.status}
                  perspective="shop"
                  initialMessages={messages}
                  complaintMessages={complaintMessages}
                  orderClosed={chatClosed(selected.status)}
                  height={580}
                  onMessage={handleIncoming}
                />
              )}
            </Stack>
          )}
        </Box>
      </Flex>
    </Stack>
  );
}
