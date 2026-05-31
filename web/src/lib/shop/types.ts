import type { WeeklySchedule } from "./schedule";

/** Shared shop types (plain module — safe to import from client + server). */
export interface ShopProfileInput {
  name: string;
  description: string;
  phone: string;
  address: string;
  /** Recurring weekly hours (persisted to `shops.schedule` jsonb). */
  schedule: WeeklySchedule;
}
