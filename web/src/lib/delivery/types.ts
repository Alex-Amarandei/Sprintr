/**
 * Provider-agnostic courier-dispatch types. Today the only provider is Glovo (LaaS), but the
 * order flow talks to these shapes — so swapping/adding a provider stays a one-file change.
 */

/** A pickup or drop-off point handed to a courier provider. */
export interface DeliveryPoint {
  lat: number;
  lng: number;
  address: string;
  contactName?: string | null;
  contactPhone?: string | null;
  /** Free-text extra info (apartment, floor, instructions). */
  details?: string | null;
}

/** A courier price quote (the cost of the delivery leg). */
export interface DeliveryQuote {
  provider: string;
  /** Fee in major currency units (lei). */
  fee: number;
  currency: string;
  etaMinutes?: number | null;
}

/** The result of dispatching a courier — frozen onto the order (`courier_*` columns). */
export interface DeliveryDispatch {
  provider: string;
  /** The provider's delivery/order id (for tracking, cancel, webhooks). */
  ref: string;
  /** The provider's raw status string. */
  status: string;
  trackingUrl?: string | null;
  courierName?: string | null;
  courierPhone?: string | null;
}

/** Friendly Romanian labels for a courier's raw status. Unknown statuses pass through as-is. */
const COURIER_STATUS_LABELS: Record<string, string> = {
  CREATED: "Creată",
  SCHEDULED: "Programată",
  ACCEPTED: "Curier alocat",
  ASSIGNED: "Curier alocat",
  PICKED_UP: "Ridicată",
  PICKING_UP: "Ridicare în curs",
  DELIVERING: "În livrare",
  ON_THE_WAY: "În livrare",
  DELIVERED: "Livrată",
  FINISHED: "Livrată",
  CANCELED: "Anulată",
  CANCELLED: "Anulată",
};

export function courierStatusLabel(status?: string | null): string | null {
  if (!status) return null;
  return COURIER_STATUS_LABELS[status.toUpperCase()] ?? status;
}
