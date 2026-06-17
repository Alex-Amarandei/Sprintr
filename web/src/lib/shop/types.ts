import type { WeeklySchedule } from "./schedule";

/** Shared shop types (plain module — safe to import from client + server). */
export interface ShopProfileInput {
  name: string;
  description: string;
  /** Contact numbers (persisted to `shops.phones`). */
  phones: string[];
  /** Public website URL (persisted to `shops.website_url`). */
  website: string;
  /** Public contact email (persisted to `shops.email`). */
  email: string;
  address: string;
  /** Recurring weekly hours (persisted to `shops.schedule` jsonb). */
  schedule: WeeklySchedule;
  /** Per-shop delivery fee ("shipping tax") in RON, charged per order. Omit to leave unchanged. */
  deliveryFee?: number;
  /** Default order ETA in minutes; seeds new orders' eta_minutes. Omit to leave unchanged. */
  defaultEtaMinutes?: number | null;
}
