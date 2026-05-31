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
  phone?: string;
  /** Real weekly hours from `shops.schedule` (null when the shop hasn't set any). */
  schedule?: WeeklySchedule | null;
}
