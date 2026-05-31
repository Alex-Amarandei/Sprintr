import type { OrderStatus } from "@/lib/design/status";
import type { ShopCategory } from "@/lib/catalog/samples";

/** Order view-model shared by the customer order views and the shop dashboard. */
export interface SampleOrderLine {
  title: string;
  summary: string;
  lineTotal: number;
  /** First attached file's name (legacy single-file chip). */
  pdfName?: string;
  /** All attached files for this line. */
  files?: { name: string }[];
}
export interface SampleMessage {
  from: "shop" | "customer";
  body: string;
  at: string;
}
export interface SampleOrder {
  id: string;
  shopId: string;
  shopName: string;
  /** Customer who placed it — shown on the shop dashboard queue. */
  customerName: string;
  /** Customer's profile id — used by the chat to classify message sides. */
  customerId?: string;
  category: ShopCategory;
  itemsCount: number;
  total: number;
  status: OrderStatus;
  placedAt: string;
  eta?: string;
  lines: SampleOrderLine[];
  subtotal: number;
  delivery: number;
  messages: SampleMessage[];
  /** Complaint-thread messages (post-completion). */
  complaintMessages?: SampleMessage[];
  // Shop-side fulfilment details.
  notes?: string;
  contactPhone?: string;
  deliveryAddress?: string;
  fulfilment?: "delivery" | "pickup";
  paymentMethod?: string;
  /** Payment state: pending | paid | failed | refunded (drives the shop's payment badge). */
  paymentStatus?: "pending" | "paid" | "failed" | "refunded";
  /** Whether the payment method is online (card) — distinguishes "unpaid" from "pay on handover". */
  online?: boolean;
}
