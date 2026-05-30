"use client";

import { useState } from "react";
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
import type { SampleMessage } from "@/lib/orders/sample";
import { Dot } from "@/components/ui/Dot";

/**
 * Per-order chat. Presentational for now — sending appends locally.
 * TODO(BE): wire to Supabase Realtime on the messages table.
 */
export function ChatPanel({
  peerName,
  initialMessages,
  height = 520,
  perspective = "customer",
}: {
  /** The other party's name (shop on the customer side, customer on the shop side). */
  peerName: string;
  initialMessages: SampleMessage[];
  height?: number;
  perspective?: "customer" | "shop";
}) {
  const mySide = perspective === "shop" ? "shop" : "customer";
  const [messages, setMessages] = useState<SampleMessage[]>(initialMessages);
  const [text, setText] = useState("");

  function send() {
    const body = text.trim();
    if (!body) return;
    setMessages((m) => [...m, { from: mySide, body, at: "acum" }]);
    setText("");
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
          color="brand"
          style={{
            backgroundColor: "var(--mantine-color-brand-1)",
            color: "var(--mantine-color-brand-7)",
          }}
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
      <Stack p="md" gap="sm" style={{ flex: 1, overflowY: "auto" }}>
        {messages.map((m, i) => {
          const mine = m.from === mySide;
          return (
            <Box
              key={i}
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
        <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Atașează">
          <Paperclip size={18} />
        </ActionIcon>
        <TextInput
          flex={1}
          placeholder="Scrie un mesaj..."
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <ActionIcon color="ink" size="lg" onClick={send} aria-label="Trimite">
          <Send size={18} />
        </ActionIcon>
      </Group>
    </Paper>
  );
}
