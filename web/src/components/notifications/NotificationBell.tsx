"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ActionIcon, Indicator, Menu, ScrollArea, Text, UnstyledButton } from "@mantine/core";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { markNotificationsRead } from "@/lib/notifications/actions";
import type { AppNotification } from "@/lib/notifications/queries";

function timeAgo(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "acum";
  if (min < 60) return `${min}m`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}z`;
}

/** Two-tone chime via Web Audio (no asset) — the shop's "new order" alert. */
function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const tone = (freq: number, start: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + 0.32);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + start + 0.34);
    };
    tone(740, 0);
    tone(988, 0.16);
  } catch {
    /* autoplay blocked / unsupported — silent */
  }
}

export function NotificationBell({
  userId,
  initialItems,
  initialUnread,
}: {
  userId: string;
  initialItems: AppNotification[];
  initialUnread: number;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState(initialItems);
  const [unread, setUnread] = useState(initialUnread);

  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as {
            id: string;
            type: string;
            title: string;
            body: string | null;
            href: string | null;
            read_at: string | null;
            created_at: string;
          };
          setItems((prev) => [
            { id: n.id, type: n.type, title: n.title, body: n.body, href: n.href, readAt: n.read_at, createdAt: n.created_at },
            ...prev,
          ].slice(0, 30));
          setUnread((u) => u + 1);
          if (n.type === "new_order") playChime();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  function onOpen() {
    if (unread === 0) return;
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    void markNotificationsRead();
  }

  return (
    <Menu position="bottom-end" width={340} withArrow shadow="md" onOpen={onOpen}>
      <Menu.Target>
        <Indicator label={unread > 9 ? "9+" : unread} size={16} disabled={unread === 0} color="brand" offset={4}>
          <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Notificări">
            <Bell size={20} />
          </ActionIcon>
        </Indicator>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Notificări</Menu.Label>
        {items.length === 0 ? (
          <Text fz="sm" c="dimmed" ta="center" py="md">
            Nicio notificare.
          </Text>
        ) : (
          <ScrollArea.Autosize mah={360}>
            {items.map((n) => {
              const content = (
                <div style={{ padding: "8px 12px", borderRadius: "var(--mantine-radius-sm)" }}>
                  <Text fz="sm" fw={n.readAt ? 500 : 700} lineClamp={1}>
                    {n.title}
                  </Text>
                  {n.body && (
                    <Text fz="xs" c="dimmed" lineClamp={1}>
                      {n.body}
                    </Text>
                  )}
                  <Text fz={10} c="dimmed" mt={2}>
                    {timeAgo(n.createdAt)}
                  </Text>
                </div>
              );
              return n.href ? (
                <UnstyledButton
                  key={n.id}
                  component={Link}
                  href={n.href}
                  display="block"
                  style={{ width: "100%" }}
                >
                  {content}
                </UnstyledButton>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })}
          </ScrollArea.Autosize>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
