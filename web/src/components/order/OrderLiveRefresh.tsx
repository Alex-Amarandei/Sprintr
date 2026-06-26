"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Live-refresh the order detail page when the order changes — status advance, payment, or an
 * accepted/declined price modification. Used on BOTH sides: the customer sees the shop advance the
 * order in real time, and the shop sees the customer accept a proposed price change without a reload.
 * Realtime respects RLS, so each side only receives events for orders it can already read.
 */
export function OrderLiveRefresh({ orderId }: { orderId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`order-live-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_modifications", filter: `order_id=eq.${orderId}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId, router]);
  return null;
}
