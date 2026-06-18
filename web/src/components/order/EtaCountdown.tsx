"use client";

import { useEffect, useState } from "react";
import { Text, type TextProps } from "@mantine/core";

/** Format a remaining-time (ms) as a Romanian duration; past-due → "în curând". */
function remaining(ms: number): string {
  if (ms <= 30_000) return "în curând";
  const min = Math.round(ms / 60_000);
  if (min < 60) return `~${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `~${h} h ${m} min` : `~${h} h`;
}

/**
 * Live "time remaining until ready" — `at − now`, recomputed every 30s. The target timestamp is
 * frozen server-side (`orders.eta_at`); here we only render the diff (no stored computation).
 * Renders nothing when there's no ETA. `suppressHydrationWarning` covers the server/client now skew.
 */
export function EtaCountdown({ at, ...textProps }: { at: string | null } & TextProps) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!at) return;
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [at]);

  if (!at) return null;
  const diff = new Date(at).getTime() - Date.now();
  return (
    <Text span suppressHydrationWarning {...textProps}>
      {remaining(diff)}
    </Text>
  );
}
