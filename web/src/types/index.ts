export type { Database, Json } from "./database";
export type { Database as DB } from "./database";

import type { Database } from "./database";

// Convenience enum aliases (kept stable for app code).
export type UserRole = Database["public"]["Enums"]["user_role"]; // 'customer' | 'shop'
export type ShopRole = Database["public"]["Enums"]["shop_role"]; // 'staff' | 'catalog' | 'owner'
export type CatalogVersionStatus =
  Database["public"]["Enums"]["catalog_version_status"]; // 'draft' | 'published' | 'archived'

// NOTE: OrderStatus returns once the orders migration lands.
