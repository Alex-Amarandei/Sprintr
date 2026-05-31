"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Avatar,
  Box,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { SampleMessage } from "@/lib/orders/sample";
import { Dot } from "@/components/ui/Dot";

type ChatMsg = {
  /** DB id once known (null for server-rendered history) — used to dedup the realtime echo. */
  id: string | null;
  from: "shop" | "customer";
  body: string;
  at: string;
};

const timeOnly = (iso: string) =>
  new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/**
 * Per-order chat backed by the `messages` table.
 * - history is server-rendered into `initialMessages`;
 * - new messages insert directly (RLS-guarded) and arrive via Supabase Realtime;
 * - a message is "mine" when its sender matches `currentUserId`. Incoming rows are
 *   classified by side using `customerId` (sender === customer → customer, else shop).
 */
export function ChatPanel({
  orderId,
  currentUserId,
  customerId,
  peerName,
  initialMessages,
  height = 520,
  perspective = "customer",
  disabled = false,
}: {
  orderId: string;
  /** Logged-in user's profile id (= sender_id on insert). */
  currentUserId: string;
  /** The order's customer id — classifies incoming messages into customer/shop sides. */
  customerId?: string;
  /** The other party's name (shop on the customer side, customer on the shop side). */
  peerName: string;
  initialMessages: SampleMessage[];
  height?: number;
  perspective?: "customer" | "shop";
  /** Order is closed (done/rejected/archived) → posting is blocked by RLS, so disable input. */
  disabled?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const mySide = perspective === "shop" ? "shop" : "customer";
  // Unique channel topic per mounted instance (defensive — avoids the "cannot add
  // postgres_changes after subscribe()" collision if two panels ever co-exist). NOTE:
  // this does NOT make it safe to mount two ChatPanels for the SAME order on one client —
  // Realtime dedups identical postgres_changes subscriptions (same table+filter) and
  // routes events to only one, starving the other. Render ONE panel per order.
  const channelKey = useId();

  const [messages, setMessages] = useState<ChatMsg[]>(() =>
    initialMessages.map((m) => ({ id: null, ...m }))
  );
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const seen = useRef(new Set<string>());
  const viewportRef = useRef<HTMLDivElement>(null);

  // Live subscription: new messages on this order arrive here (RLS scopes to participants).
  useEffect(() => {
    const channel = supabase
      .channel(`order-chat-${orderId}-${channelKey}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `order_id=eq.${orderId}` },
        (payload) => {
          const row = payload.new as {
            id: string;
            sender_id: string;
            body: string;
            created_at: string;
          };
          if (seen.current.has(row.id)) return; // already shown (our own optimistic insert)
          seen.current.add(row.id);
          setMessages((prev) => [
            ...prev,
            {
              id: row.id,
              from: row.sender_id === customerId ? "customer" : "shop",
              body: row.body,
              at: timeOnly(row.created_at),
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, orderId, customerId, channelKey]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = viewportRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function send() {
    const body = text.trim();
    if (!body || sending || disabled) return;

    setSending(true);
    setText("");

    const { data, error } = await supabase
      .from("messages")
      .insert({ order_id: orderId, sender_id: currentUserId, body })
      .select("id, created_at")
      .single();

    setSending(false);

    if (error || !data) {
      setText(body); // restore so the user can retry
      toast.error("Mesajul nu a putut fi trimis.");
      return;
    }

    // Show it immediately and mark seen so the realtime echo doesn't duplicate it.
    seen.current.add(data.id);
    setMessages((prev) => [
      ...prev,
      { id: data.id, from: mySide, body, at: timeOnly(data.created_at) },
    ]);
  }

  const initials = peerName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <Paper
      withBorder
      radius="lg"
      p={0}
      style={{ display: "flex", flexDirection: "column", height }}
    >
      {/* Header */}
      <Group
        p="md"
        gap="sm"
        wrap="nowrap"
        style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
      >
        <Avatar
          radius="xl"
          style={
            {
              "--avatar-bg": "var(--mantine-color-brand-1)",
              "--avatar-color": "var(--mantine-color-brand-7)",
            } as React.CSSProperties
          }
        >
          {initials}
        </Avatar>
        <div>
          <Text fw={600} fz="sm">
            {peerName}
          </Text>
          <Group gap={6}>
            <Dot color="teal" />
            <Text fz="xs" c="dimmed">
              Online · răspunde rapid
            </Text>
          </Group>
        </div>
      </Group>

      {/* Messages */}
      <Stack ref={viewportRef} p="md" gap="sm" style={{ flex: 1, overflowY: "auto" }}>
        {messages.map((m, i) => {
          const mine = m.from === mySide;
          return (
            <Box
              key={m.id ?? `seed-${i}`}
              style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%" }}
            >
              <Paper
                radius="lg"
                px="md"
                py={8}
                bg={mine ? "brand.6" : "var(--mantine-color-default-hover)"}
              >
                <Text fz="sm" c={mine ? "white" : "var(--mantine-color-text)"}>
                  {m.body}
                </Text>
              </Paper>
              <Text fz={10} c="dimmed" ta={mine ? "right" : "left"} mt={2}>
                {m.at}
              </Text>
            </Box>
          );
        })}
      </Stack>

      {/* Input */}
      <Group
        p="sm"
        gap="xs"
        wrap="nowrap"
        style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}
      >
        <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Atașează" disabled>
          <Paperclip size={18} />
        </ActionIcon>
        <TextInput
          flex={1}
          placeholder={disabled ? "Conversația este închisă" : "Scrie un mesaj..."}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <ActionIcon
          color="ink"
          size="lg"
          onClick={send}
          loading={sending}
          disabled={disabled || !text.trim()}
          aria-label="Trimite"
        >
          <Send size={18} />
        </ActionIcon>
      </Group>
    </Paper>
  );
}
