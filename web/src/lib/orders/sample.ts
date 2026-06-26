import type { OrderStatus } from "@/lib/design/status";
import type { ShopCategory } from "@/lib/catalog/samples";

/** One row of the shop's order export (CSV report). */
export interface ExportRow {
  id: string;
  createdAt: string;
  status: OrderStatus;
  total: number;
  commission: number;
  payout: number;
  paymentMethod: string;
}

/** Order view-model shared by the customer order views and the shop dashboard. */
export interface SampleOrderLine {
  /** The order_item row id (for per-line actions like rejection). */
  lineId?: string;
  /** Frozen catalog item id — used to deep-link the order line back to the product card. */
  itemId?: string;
  title: string;
  summary: string;
  lineTotal: number;
  /** Shop marked this line rejected (out of stock) — struck through, excluded from the total. */
  rejected?: boolean;
  /** First attached file's name (legacy single-file chip). */
  pdfName?: string;
  /** All attached files for this line. */
  files?: { name: string }[];
}
export interface ChatAttachment {
  path: string;
  name: string;
}
export interface SampleMessage {
  from: "shop" | "customer";
  body: string;
  at: string;
  /** Image attachments (storage paths); rendered via the signed-URL chat-media endpoint. */
  attachments?: ChatAttachment[];
}
export interface SampleOrder {
  id: string;
  shopId: string;
  shopName: string;
  /** Customer who placed it — shown on the shop dashboard queue. */
  customerName: string;
  /** Customer's profile id — used by the chat to classify message sides. */
  customerId?: string;
  /** Customer contact — only resolvable by the shop (RLS), used on the shop order detail. */
  customerPhone?: string;
  customerEmail?: string;
  category: ShopCategory;
  itemsCount: number;
  total: number;
  status: OrderStatus;
  placedAt: string;
  /** Raw ISO of `created_at` — powers the click-to-reveal exact time (relative by default). */
  placedAtIso?: string;
  /** ETA display string (e.g. "~30 min") derived from etaMinutes. */
  eta?: string;
  /** Raw per-order ETA in minutes (shop-editable, defaults from the shop). Visible both sides. */
  etaMinutes?: number | null;
  /** Absolute ETA target timestamp (ISO) — drives the live "Estimat de completare" countdown. */
  etaAt?: string | null;
  lines: SampleOrderLine[];
  subtotal: number;
  /** Legacy single line (total − subtotal); prefer the explicit fields below. */
  delivery: number;
  /** Frozen money-breakdown lines for the order lifecycle. */
  shippingFee?: number;
  serviceFee?: number;
  discount?: number;
  /** Net of accepted shop modifications (signed: + extra charge, − reduction). */
  adjustment?: number;
  /** Shop-facing payout breakdown (platform keeps `commission`; shop receives `payout`). */
  commission?: number;
  payout?: number;
  messages: SampleMessage[];
  /** Complaint-thread messages (post-completion). */
  complaintMessages?: SampleMessage[];
  // Shop-side fulfilment details.
  notes?: string;
  contactPhone?: string;
  deliveryAddress?: string;
  /** Precise drop-off coordinates from the checkout map/geolocation (for the shop's map link). */
  deliveryLat?: number;
  deliveryLng?: number;
  fulfilment?: "delivery" | "pickup";
  // External courier dispatch (e.g. Glovo), when an order is sent out via a courier provider.
  courierProvider?: string;
  courierName?: string;
  courierPhone?: string;
  courierStatus?: string;
  courierTrackingUrl?: string;
  paymentMethod?: string;
  /** Payment state: pending | paid | failed | refunded (drives the shop's payment badge). */
  paymentStatus?: "pending" | "paid" | "failed" | "refunded";
  /** Whether the payment method is online (card) — distinguishes "unpaid" from "pay on handover". */
  online?: boolean;
}
