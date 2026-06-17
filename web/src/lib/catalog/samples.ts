// Shop view-model shared by the browse list and shop profile pages.

import type { WeeklySchedule } from "@/lib/shop/schedule";

/** Visual category — drives the card's icon + gradient. */
export type ShopCategory = "print" | "copy" | "binding" | "stationery";

export interface SampleShop {
  id: string;
  name: string;
  description: string;
  address: string;
  // Optional display fields (BE may omit → card degrades gracefully).
  category?: ShopCategory;
  rating?: number;
  reviews?: number;
  /** Delivery estimate, e.g. "25–35 min". */
  eta?: string;
  tags?: string[];
  isOpen?: boolean;
  /** When closed, the next opening time, e.g. "09:00". */
  opensAt?: string;
  /** Contact numbers (a shop may publish several, e.g. an order line + a personalizare line). */
  phones?: string[];
  /** Public website URL, when the shop has one. */
  website?: string | null;
  /** Per-order delivery fee in lei (0 = free). */
  deliveryFee?: number;
  /** Shop coordinates (owner-set) — drive the delivery-radius check. Null when not set. */
  lat?: number | null;
  lng?: number | null;
  /** Real weekly hours from `shops.schedule` (null when the shop hasn't set any). */
  schedule?: WeeklySchedule | null;
  /** Date-keyed exceptions from `shops.schedule_overrides` (temporary pause etc.). */
  scheduleOverrides?: Record<string, { open: string; close: string } | null>;
  /** Public URLs for the shop's logo + banner (shop-assets storage), when uploaded. */
  logoUrl?: string | null;
  bannerUrl?: string | null;
}
