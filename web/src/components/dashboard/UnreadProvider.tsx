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
  currentUserId,
  children,
}: {
  initialCount: number;
  currentUserId: string;
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [count, setCount] = useState(initialCount);

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc("shop_unread_count");
    if (typeof data === "number") setCount(data);
  }, [supabase]);

  // Any new message in the shop's orders (a customer writing) → recompute the count.
  useEffect(() => {
    const channel = supabase
      .channel("shop-unread")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refresh]);

  const markRead = useCallback(
    async (orderId: string) => {
      await supabase.from("message_reads").upsert(
        {
          order_id: orderId,
          profile_id: currentUserId,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "order_id,profile_id" }
      );
      await refresh();
    },
    [supabase, currentUserId, refresh]
  );

  const value = useMemo(
    () => ({ count, refresh, markRead }),
    [count, refresh, markRead]
  );

  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}
