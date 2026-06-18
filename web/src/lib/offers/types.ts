import type { Database } from "@/types/database";

export type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
export type OfferType = Database["public"]["Enums"]["offer_type"];
export type OfferScope = Database["public"]["Enums"]["offer_scope"];
export type OfferTrigger = Database["public"]["Enums"]["offer_trigger"];

/** Type-specific numeric config stored in `offers.config` (jsonb). */
export type OfferConfig = {
  percent?: number; // percent
  amount?: number; // fixed
  buy?: number; // bxgy
  get?: number; // bxgy
  /** Optional storefront banner accent colour (CSS color) for this promo. */
  bannerColor?: string;
};

/** What the builder UI submits to create/update an offer. */
export interface OfferInput {
  name: string;
  description?: string | null;
  type: OfferType;
  scope: OfferScope;
  target_id?: string | null;
  trigger: OfferTrigger;
  code?: string | null;
  config: OfferConfig;
  stackable: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  active: boolean;
}

/**
 * Coerce an input to satisfy the DB CHECK guards (so a bad combo fails fast client-side
 * with a clear shape rather than a Postgres constraint error):
 *  - cart scope carries no target; product/category must.
 *  - automatic offers have no code; code offers keep an upper-cased code.
 *  - config keeps only the keys relevant to the type.
 */
export function normalizeOfferInput(input: OfferInput): OfferInput {
  const scope = input.type === "free_shipping" ? "cart" : input.scope;
  const target_id = scope === "cart" ? null : (input.target_id ?? null);
  const code =
    input.trigger === "code" ? (input.code ?? "").trim().toUpperCase() || null : null;

  let config: OfferConfig = {};
  if (input.type === "percent") config = { percent: input.config.percent ?? 0 };
  else if (input.type === "fixed") config = { amount: input.config.amount ?? 0 };
  else if (input.type === "bxgy")
    config = { buy: input.config.buy ?? 1, get: input.config.get ?? 1 };
  // Preserve the optional banner colour across the type-specific rebuild.
  if (input.config.bannerColor) config.bannerColor = input.config.bannerColor;

  return { ...input, scope, target_id, code, config };
}
