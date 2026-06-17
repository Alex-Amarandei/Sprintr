"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

interface UnreadContextValue {
  /** Unread customer messages across the shop's orders. */
  count: number;
  /** Recompute from the server (RPC). */
  refresh: () => Promise<void>;
  /** Mark one order's messages as read for the current user, then recompute. */
  markRead: (orderId: string) => Promise<void>;
}

const UnreadContext = createContext<UnreadContextValue>({
  count: 0,
  refresh: async () => {},
  markRead: async () => {},
});

export const useUnread = () => useContext(UnreadContext);

/**
 * Holds the shop's unread-message count for the sidebar dot. Seeded from the server,
 * kept live by a Realtime subscription on `messages` (RLS scopes it to the shop's own
 * orders), and decremented when a conversation is opened (markRead).
 */
export function UnreadProvider({
  initialCount,
  children,
}: {
  initialCount: number;
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [count, setCount] = useState(initialCount);

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc("shop_unread_count");
    if (typeof data === "number") setCount(data);
  }, [supabase]);

  // Keep the count live: a new customer message (count up) OR a read in another tab — our own
  // `message_reads` row changing (count down) — both recompute. RLS scopes delivery to us.
  useEffect(() => {
    const channel = supabase
      .channel("shop-unread")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reads" },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refresh]);

  // Read state is shop-wide: another employee may have read a thread on their own screen.
  // Recompute when this tab regains focus so the badge reflects their read.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  const markRead = useCallback(
    async (orderId: string) => {
      // Server-time upsert (avoids client clock skew leaving a just-read message "unread").
      await supabase.rpc("mark_order_read", { p_order_id: orderId });
      await refresh();
    },
    [supabase, refresh]
  );

  const value = useMemo(
    () => ({ count, refresh, markRead }),
    [count, refresh, markRead]
  );

  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}
