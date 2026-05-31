import type { OrderStatus } from "@/lib/design/status";
import type { ShopCategory } from "@/lib/catalog/samples";

/** Order view-model shared by the customer order views and the shop dashboard. */
export interface SampleOrderLine {
  title: string;
  summary: string;
  lineTotal: number;
  pdfName?: string;
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
  // Shop-side fulfilment details.
  notes?: string;
  contactPhone?: string;
  deliveryAddress?: string;
  fulfilment?: "delivery" | "pickup";
  paymentMethod?: string;
}
