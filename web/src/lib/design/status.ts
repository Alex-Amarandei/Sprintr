import type { MantineColor } from "@mantine/core";
import type { Database } from "@/types/database";

/**
 * Order-status design tokens — single source of truth for label + colour across
 * badges, pills, and the status timeline. Keyed to the DB enum `order_status`
 * (pending | accepted | rejected | in_progress | done).
 */
export type OrderStatus = Database["public"]["Enums"]["order_status"];

export interface StatusMeta {
  /** Romanian customer-facing label. */
  label: string;
  /** Mantine palette key for the dot/text (see theme.ts). */
  color: MantineColor;
  /** Explicit Badge colour (may include a shade, e.g. "teal.6"). Defaults to `color`. */
  badgeColor?: MantineColor;
  /** Badge variant. "light" (tinted) by default; "filled" for a solid pill. */
  badgeVariant?: "light" | "filled";
}

export const ORDER_STATUS: Record<OrderStatus, StatusMeta> = {
  pending: { label: "În așteptare", color: "brand" },
  accepted: {
    label: "Acceptată",
    color: "teal",
    badgeColor: "teal.6",
    badgeVariant: "filled",
  },
  in_progress: { label: "În pregătire", color: "cyan" },
  done: { label: "Finalizată", color: "mist" },
  rejected: { label: "Respinsă", color: "red" },
};

/** Happy-path progression (rejected is a terminal branch, excluded). */
export const ORDER_FLOW: OrderStatus[] = [
  "pending",
  "accepted",
  "in_progress",
  "done",
];

/** Step index of a status within the happy path, or -1 (e.g. rejected). */
export function statusStep(status: OrderStatus): number {
  return ORDER_FLOW.indexOf(status);
}
