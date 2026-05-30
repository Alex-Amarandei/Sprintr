/** Shared shop types (plain module — safe to import from client + server). */
export interface ShopProfileInput {
  name: string;
  description: string;
  phone: string;
  address: string;
}
