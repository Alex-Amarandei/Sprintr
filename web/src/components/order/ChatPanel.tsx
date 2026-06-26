"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Avatar,
  Box,
  Button,
  FileButton,
  Group,
  Image,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";

// Shop-side quick replies — one tap fills the input (editable before sending).
const CANNED_REPLIES = [
  "Bună ziua! Comanda ta este în lucru. 👍",
  "Comanda este gata de ridicare.",
  "Întârziem puțin, revenim imediat cu un update.",
  "Mulțumim pentru comandă! 🙌",
];
import { Paperclip, Receipt, Send, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { uploadChatImages, CHAT_IMAGE_ACCEPT } from "@/lib/storage/chatMedia";
import type { ChatAttachment, SampleMessage } from "@/lib/orders/sample";
import type { Json } from "@/types/database";
import type { OrderStatus } from "@/lib/design/status";
import { Dot } from "@/components/ui/Dot";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LinkActionIcon } from "@/components/ui/links";
import { useUnread } from "@/components/dashboard/UnreadProvider";

type Thread = "order" | "complaint";
type ChatMsg = {
  /** DB id once known (null for server-rendered history) — used to dedup the realtime echo. */
  id: string | null;
  from: "shop" | "customer";
  body: string;
  at: string;
  attachments?: ChatAttachment[];
};

const timeOnly = (iso: string) =>
  new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/**
 * Per-order chat backed by the `messages` table, with TWO threads:
 *  - "order" — normal coordination, open while the order is active;
 *  - "complaint" — opens once the order is done/rejected so the customer can still report a
 *    problem after delivery (RLS enforces the windows; this just reflects them).
 * One Realtime subscription per order (filter `order_id`); incoming rows route to a thread by
 * `kind`. (Two subscriptions with the same filter would dedup and starve one — so keep it one.)
 */
export function ChatPanel({
  orderId,
  currentUserId,
  customerId,
  peerName,
  orderRef,
  orderStatus,
  initialMessages,
  complaintMessages = [],
  height = 520,
  perspective = "customer",
  orderClosed = false,
  onMessage,
}: {
  orderId: string;
  /** Logged-in user's profile id (= sender_id on insert). */
  currentUserId: string;
  /** The order's customer id — classifies incoming messages into customer/shop sides. */
  customerId?: string;
  /** The other party's name (shop on the customer side, customer on the shop side). */
  peerName: string;
  /** Optional order reference shown as the header title (e.g. "#7d301208"). */
  orderRef?: string;
  /** Optional order status shown beside the reference in the header. */
  orderStatus?: OrderStatus;
  /** Order-thread history. */
  initialMessages: SampleMessage[];
  /** Complaint-thread history. */
  complaintMessages?: SampleMessage[];
  /** Panel height — a number (px) or any CSS value ("100%" to fill a sized parent). */
  height?: number | string;
  perspective?: "customer" | "shop";
  /** Order is terminal (done/rejected) → order thread read-only, complaint thread open. */
  orderClosed?: boolean;
  /** Called when an incoming (non-own) message arrives via Realtime — e.g. to mark read. */
  onMessage?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const mySide = perspective === "shop" ? "shop" : "customer";
  const channelKey = useId();

  const [orderMsgs, setOrderMsgs] = useState<ChatMsg[]>(() =>
    initialMessages.map((m) => ({ id: null, ...m })),
  );
  const [complaintMsgs, setComplaintMsgs] = useState<ChatMsg[]>(() =>
    complaintMessages.map((m) => ({ id: null, ...m })),
  );
  // When the order is closed the complaint thread is the actionable one — default to it.
  const [tab, setTab] = useState<Thread>(orderClosed ? "complaint" : "order");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingImages, setPendingImages] = useState<File[]>([]);

  const seen = useRef(new Set<string>());
  const viewportRef = useRef<HTMLDivElement>(null);

  // Single live subscription; route each incoming row to its thread by `kind`.
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
            kind: Thread;
            attachments?: ChatAttachment[];
          };
          if (seen.current.has(row.id)) return; // already shown (our own optimistic insert)
          seen.current.add(row.id);
          const msg: ChatMsg = {
            id: row.id,
            from: row.sender_id === customerId ? "customer" : "shop",
            body: row.body,
            at: timeOnly(row.created_at),
            attachments: Array.isArray(row.attachments) ? row.attachments : [],
          };
          (row.kind === "complaint" ? setComplaintMsgs : setOrderMsgs)((prev) => [...prev, msg]);
          onMessage?.();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, orderId, customerId, channelKey, onMessage]);

  const messages = tab === "complaint" ? complaintMsgs : orderMsgs;

  // Shop side: opening the order (and any new message while it's open) marks the thread read,
  // clearing the sidebar unread badge. No-op on the customer side (no UnreadProvider).
  const { markRead } = useUnread();
  useEffect(() => {
    if (perspective === "shop") void markRead(orderId);
  }, [perspective, orderId, markRead, orderMsgs.length, complaintMsgs.length]);

  // Keep the newest message in view (on thread switch + new messages).
  useEffect(() => {
    const el = viewportRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, tab]);

  // Order thread is read-only once closed; complaint thread is only open once closed.
  const inputDisabled = tab === "order" ? orderClosed : !orderClosed;

  async function send() {
    const body = text.trim();
    const images = pendingImages;
    if ((!body && images.length === 0) || sending || inputDisabled) return;

    setSending(true);
    setText("");
    setPendingImages([]);

    let attachments: ChatAttachment[] = [];
    try {
      attachments = await uploadChatImages(images);
    } catch (e) {
      setSending(false);
      setText(body); // restore so the user can retry
      setPendingImages(images);
      toast.error(e instanceof Error ? e.message : "Imaginile nu au putut fi trimise.");
      return;
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        order_id: orderId,
        sender_id: currentUserId,
        body,
        kind: tab,
        attachments: attachments as unknown as Json,
      })
      .select("id, created_at")
      .single();

    setSending(false);

    if (error || !data) {
      setText(body); // restore so the user can retry
      setPendingImages(images);
      toast.error("Mesajul nu a putut fi trimis.");
      return;
    }

    seen.current.add(data.id);
    const msg: ChatMsg = {
      id: data.id,
      from: mySide,
      body,
      at: timeOnly(data.created_at),
      attachments,
    };
    (tab === "complaint" ? setComplaintMsgs : setOrderMsgs)((prev) => [...prev, msg]);
  }

  const initials = peerName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const orderHref =
    perspective === "shop" ? `/dashboard/orders/${orderId}` : `/order/${orderId}`;

  const placeholder = inputDisabled
    ? tab === "order"
      ? "Conversația comenzii este închisă"
      : "Reclamațiile sunt disponibile după finalizarea comenzii"
    : tab === "complaint"
      ? "Descrie problema..."
      : "Scrie un mesaj...";

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
        justify="space-between"
        style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
      >
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
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
          <div style={{ minWidth: 0 }}>
            {orderRef ? (
              <>
                {/* Title: order reference + status first, then the name (per the inbox spec). */}
                <Group gap={6} wrap="nowrap">
                  <Text fw={600} fz="sm" truncate>
                    {orderRef}
                  </Text>
                  {orderStatus && (
                    <StatusBadge status={orderStatus} size="xs" style={{ flexShrink: 0 }} />
                  )}
                </Group>
                <Text fz="xs" c="dimmed" truncate>
                  {peerName}
                </Text>
              </>
            ) : (
              <>
                <Text fw={600} fz="sm" truncate>
                  {peerName}
                </Text>
                <Group gap={6}>
                  <Dot color="teal" />
                  <Text fz="xs" c="dimmed">
                    Online · răspunde rapid
                  </Text>
                </Group>
              </>
            )}
          </div>
        </Group>

        <Tooltip label="Vezi comanda" withinPortal>
          <LinkActionIcon
            href={orderHref}
            variant="subtle"
            color="gray"
            size="lg"
            aria-label="Vezi comanda"
            style={{ flexShrink: 0 }}
          >
            <Receipt size={18} />
          </LinkActionIcon>
        </Tooltip>
      </Group>

      {/* Thread switch — only once the order is closed (complaint thread exists). */}
      {orderClosed && (
        <Box p="xs" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
          <SegmentedControl
            fullWidth
            size="xs"
            value={tab}
            onChange={(v) => setTab(v as Thread)}
            data={[
              { value: "complaint", label: "Reclamație" },
              { value: "order", label: "Conversație" },
            ]}
          />
        </Box>
      )}

      {/* Messages */}
      <Stack ref={viewportRef} p="md" gap="sm" style={{ flex: 1, overflowY: "auto" }}>
        {messages.length === 0 && tab === "complaint" && (
          <Text fz="sm" c="dimmed" ta="center" py="md">
            Ai o problemă cu această comandă? Scrie-ne aici și magazinul îți răspunde.
          </Text>
        )}
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
                {m.attachments && m.attachments.length > 0 && (
                  <Stack gap={6} mb={m.body ? 6 : 0}>
                    {m.attachments.map((att, k) => (
                      <a
                        key={k}
                        href={`/api/orders/${orderId}/chat-media?path=${encodeURIComponent(att.path)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Image
                          src={`/api/orders/${orderId}/chat-media?path=${encodeURIComponent(att.path)}`}
                          alt={att.name}
                          radius="md"
                          fit="cover"
                          mah={220}
                        />
                      </a>
                    ))}
                  </Stack>
                )}
                {m.body && (
                  <Text fz="sm" c={mine ? "white" : "var(--mantine-color-text)"}>
                    {m.body}
                  </Text>
                )}
              </Paper>
              <Text fz={10} c="dimmed" ta={mine ? "right" : "left"} mt={2}>
                {m.at}
              </Text>
            </Box>
          );
        })}
      </Stack>

      {/* Canned replies — shop only, while the thread is writable. */}
      {perspective === "shop" && !inputDisabled && (
        <Group gap={6} px="sm" pt="xs" wrap="wrap">
          {CANNED_REPLIES.map((c) => (
            <Button
              key={c}
              variant="default"
              size="compact-xs"
              onClick={() => setText(c)}
              styles={{ root: { fontWeight: 500 } }}
            >
              {c.length > 26 ? `${c.slice(0, 24)}…` : c}
            </Button>
          ))}
        </Group>
      )}

      {/* Pending image previews */}
      {pendingImages.length > 0 && !inputDisabled && (
        <Group gap={6} px="sm" pt="xs" wrap="wrap">
          {pendingImages.map((f, i) => (
            <Box key={i} pos="relative">
              <Image
                src={URL.createObjectURL(f)}
                alt={f.name}
                w={56}
                h={56}
                radius="sm"
                fit="cover"
              />
              <ActionIcon
                size="xs"
                color="red"
                variant="filled"
                radius="xl"
                pos="absolute"
                top={-6}
                right={-6}
                aria-label="Elimină imaginea"
                onClick={() => setPendingImages((prev) => prev.filter((_, k) => k !== i))}
              >
                <X size={12} />
              </ActionIcon>
            </Box>
          ))}
        </Group>
      )}

      {/* Input */}
      <Group
        p="sm"
        gap="xs"
        wrap="nowrap"
        style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}
      >
        <FileButton
          accept={CHAT_IMAGE_ACCEPT}
          multiple
          onChange={(picked) =>
            setPendingImages((prev) => [...prev, ...(Array.isArray(picked) ? picked : [])])
          }
        >
          {(props) => (
            <ActionIcon
              {...props}
              variant="subtle"
              color="gray"
              size="lg"
              aria-label="Atașează imagine"
              disabled={inputDisabled || sending}
            >
              <Paperclip size={18} />
            </ActionIcon>
          )}
        </FileButton>
        <TextInput
          flex={1}
          placeholder={placeholder}
          value={text}
          disabled={inputDisabled}
          onChange={(e) => setText(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <ActionIcon
          color="ink"
          size="lg"
          onClick={send}
          loading={sending}
          disabled={inputDisabled || (!text.trim() && pendingImages.length === 0)}
          aria-label="Trimite"
        >
          <Send size={18} />
        </ActionIcon>
      </Group>
    </Paper>
  );
}
