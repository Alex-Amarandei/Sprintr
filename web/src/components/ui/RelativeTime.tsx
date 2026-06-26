"use client";

import { useState } from "react";
import { Text, type TextProps } from "@mantine/core";
import { formatDate, relativeTime } from "@/lib/utils/format";

/**
 * Relative timestamp ("Acum 5 min") that flips to the exact date+time on click. Falls back to a
 * pre-formatted string when no ISO is available. `suppressHydrationWarning` covers server/client
 * now-skew (relative time is computed from `Date.now()`).
 */
export function RelativeTime({
  iso,
  fallback,
  ...props
}: { iso?: string | null; fallback?: string } & TextProps) {
  const [absolute, setAbsolute] = useState(false);

  if (!iso) return <>{fallback ?? null}</>;
  const exact = formatDate(iso);
  return (
    <Text
      component="span"
      title={exact}
      style={{ cursor: "pointer" }}
      suppressHydrationWarning
      onClick={(e) => {
        e.stopPropagation();
        setAbsolute((v) => !v);
      }}
      {...props}
    >
      {absolute ? exact : relativeTime(iso)}
    </Text>
  );
}
