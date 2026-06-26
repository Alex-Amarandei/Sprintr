import type { MantineColor } from "@mantine/core";
import type { Database } from "@/types/database";

/**
 * Order-status design tokens — single source of truth for label + colour across
 * badges, pills, and the status timeline. Keyed to the DB enum `order_status`
 * (pending | accepted | rejected | in_progress | in_delivery | done).
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
  ready_for_pickup: { label: "Gata de ridicare", color: "orange" },
  in_delivery: { label: "În livrare", color: "indigo" },
  picked_up: { label: "Ridicată", color: "teal" },
  delivered: { label: "Livrată", color: "teal" },
  done: { label: "Finalizată", color: "mist" },
  rejected: { label: "Respinsă", color: "red" },
  cancelled: { label: "Anulată", color: "gray" },
};

/**
 * Happy-path progression (rejected is a terminal branch, excluded). `in_delivery` only
 * applies to delivery fulfilment — pickup orders skip it (FE branches on fulfilment).
 */
export const ORDER_FLOW: OrderStatus[] = [
  "pending",
  "accepted",
  "in_progress",
  "in_delivery",
  "done",
];

/** Step index of a status within the happy path, or -1 (e.g. rejected). */
export function statusStep(status: OrderStatus): number {
  return ORDER_FLOW.indexOf(status);
}

/** Terminal = the order is finished (no further action). Receipts are only offered then. */
export const TERMINAL_STATUSES: OrderStatus[] = [
  "done",
  "rejected",
  "cancelled",
  "picked_up",
  "delivered",
];

/** Statuses a customer may still cancel themselves (before the shop starts preparing). */
export const CUSTOMER_CANCELLABLE: OrderStatus[] = ["pending", "accepted"];
export function isCustomerCancellable(status: OrderStatus): boolean {
  return CUSTOMER_CANCELLABLE.includes(status);
}
export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Successfully completed (terminal but NOT rejected) — drives reviews, reorder, "Finalizate". */
export const COMPLETED_STATUSES: OrderStatus[] = ["done", "picked_up", "delivered"];
export function isCompletedStatus(status: OrderStatus): boolean {
  return COMPLETED_STATUSES.includes(status);
}

/**
 * The ETA ("Estimat de completare") is only meaningful while the order is still being prepared.
 * Once it's out for delivery, ready, or finished, the estimate is moot and must be hidden.
 */
export const ETA_ACTIVE_STATUSES: OrderStatus[] = ["pending", "accepted", "in_progress"];
export function isEtaActive(status: OrderStatus): boolean {
  return ETA_ACTIVE_STATUSES.includes(status);
}
