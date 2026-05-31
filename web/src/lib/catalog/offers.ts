import type { Database } from "@/types/database";

/**
 * Offer discount engine (pure TS — runs in the browser for live preview AND on the server
 * for the authoritative reprice at placement). See CLAUDE.md "Offers + money model".
 *
 * An offer is a function applied to the cart. Application order is product → category → cart;
 * percents apply on the running (already-discounted) amount so stackable percents COMPOUND.
 * Stacking: `stackable=false` is exclusive — we evaluate (A) all stackable offers together vs
 * (B) each exclusive offer alone, and keep whichever yields the bigger customer benefit.
 */

export type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
export type OfferType = Database["public"]["Enums"]["offer_type"];
export type OfferScope = Database["public"]["Enums"]["offer_scope"];

/** The minimal offer shape the engine needs (DB rows map onto it via `toEngineOffer`). */
export interface EngineOffer {
  id: string;
  name: string;
  type: OfferType;
  scope: OfferScope;
  target_id: string | null;
  stackable: boolean;
  config: { percent?: number; amount?: number; buy?: number; get?: number };
}

/** One cart line the engine prices. `lineTotal` is the frozen pre-discount total. */
export interface CartLineInput {
  lineId: string;
  itemId: string;
  categoryId: string | null;
  quantity: number;
  lineTotal: number;
}

export interface AppliedOffer {
  id: string;
  name: string;
  amount: number; // lei off (for free_shipping: the shipping saved)
}

export interface LineResult {
  lineId: string;
  lineTotal: number; // original (pre-discount)
  discount: number; // total off this line
  finalTotal: number; // lineTotal − discount
  offers: AppliedOffer[]; // offers that hit this line (drives the strikethrough label)
}

export interface OffersResult {
  lines: LineResult[];
  lineDiscount: number; // Σ per-line (product/category) discounts
  cartDiscount: number; // order-level (cart scope) discount
  discount: number; // lineDiscount + cartDiscount — the goods discount stored on the order
  freeShipping: boolean;
  shippingFee: number; // after free shipping (0 when freeShipping)
  appliedOffers: AppliedOffer[]; // frozen onto the order
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Coerce a DB offer row (config is opaque Json) into the engine shape. */
export function toEngineOffer(row: OfferRow): EngineOffer {
  const c = (row.config ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    scope: row.scope,
    target_id: row.target_id,
    stackable: row.stackable,
    config: {
      percent: num(c.percent),
      amount: num(c.amount),
      buy: num(c.buy),
      get: num(c.get),
    },
  };
}

/** Is an offer currently live (active + within its optional window)? Mirror of `offer_is_live`. */
export function isOfferLive(
  row: Pick<OfferRow, "active" | "starts_at" | "ends_at">,
  now: Date = new Date(),
): boolean {
  if (!row.active) return false;
  if (row.starts_at && new Date(row.starts_at) > now) return false;
  if (row.ends_at && new Date(row.ends_at) < now) return false;
  return true;
}

/** Apply a concrete set of offers to the cart (no stacking decision — caller picks the set). */
function applyBundle(
  lines: CartLineInput[],
  offers: EngineOffer[],
  baseShipping: number,
): OffersResult {
  const state = lines.map((line) => ({
    line,
    remaining: line.lineTotal,
    discount: 0,
    offers: [] as AppliedOffer[],
  }));
  const applied: AppliedOffer[] = [];
  let freeShipping = false;

  const inScope = (s: OfferScope) => offers.filter((o) => o.scope === s);

  const hitLine = (st: (typeof state)[number], o: EngineOffer) => {
    let d = 0;
    if (o.type === "percent") d = (st.remaining * (o.config.percent ?? 0)) / 100;
    else if (o.type === "fixed") d = Math.min(o.config.amount ?? 0, st.remaining);
    else if (o.type === "bxgy") {
      const buy = o.config.buy ?? 0;
      const get = o.config.get ?? 0;
      if (buy + get > 0 && st.line.quantity > 0) {
        const unit = st.line.lineTotal / st.line.quantity;
        const freeUnits = Math.floor(st.line.quantity / (buy + get)) * get;
        d = Math.min(freeUnits * unit, st.remaining);
      }
    }
    d = round2(d);
    if (d > 0) {
      st.remaining = round2(st.remaining - d);
      st.discount = round2(st.discount + d);
      st.offers.push({ id: o.id, name: o.name, amount: d });
      applied.push({ id: o.id, name: o.name, amount: d });
    }
  };

  // Per-line scopes first (product, then category) — these compound on the line.
  for (const o of inScope("product"))
    for (const st of state) if (st.line.itemId === o.target_id) hitLine(st, o);
  for (const o of inScope("category"))
    for (const st of state)
      if (st.line.categoryId && st.line.categoryId === o.target_id) hitLine(st, o);

  // Cart scope last — on the running subtotal (after line discounts), compounding.
  let cartDiscount = 0;
  let runningSubtotal = round2(state.reduce((s, st) => s + st.remaining, 0));
  for (const o of inScope("cart")) {
    if (o.type === "free_shipping") {
      freeShipping = true;
      applied.push({ id: o.id, name: o.name, amount: round2(baseShipping) });
      continue;
    }
    let d = 0;
    if (o.type === "percent") d = (runningSubtotal * (o.config.percent ?? 0)) / 100;
    else if (o.type === "fixed") d = Math.min(o.config.amount ?? 0, runningSubtotal);
    d = round2(d);
    if (d > 0) {
      cartDiscount = round2(cartDiscount + d);
      runningSubtotal = round2(runningSubtotal - d);
      applied.push({ id: o.id, name: o.name, amount: d });
    }
  }

  const lineDiscount = round2(state.reduce((s, st) => s + st.discount, 0));
  return {
    lines: state.map((st) => ({
      lineId: st.line.lineId,
      lineTotal: st.line.lineTotal,
      discount: st.discount,
      finalTotal: round2(st.line.lineTotal - st.discount),
      offers: st.offers,
    })),
    lineDiscount,
    cartDiscount,
    discount: round2(lineDiscount + cartDiscount),
    freeShipping,
    shippingFee: freeShipping ? 0 : round2(baseShipping),
    appliedOffers: applied,
  };
}

/**
 * Apply offers to the cart, resolving the stacking decision: best of
 *  (A) all stackable offers combined vs (B) each exclusive (stackable=false) offer alone.
 * "Best" = largest customer benefit (goods discount + any shipping saved).
 */
export function applyOffers(
  lines: CartLineInput[],
  offers: EngineOffer[],
  baseShipping: number,
): OffersResult {
  const stackable = offers.filter((o) => o.stackable);
  const exclusive = offers.filter((o) => !o.stackable);

  const candidates: OffersResult[] = [applyBundle(lines, stackable, baseShipping)];
  for (const o of exclusive) candidates.push(applyBundle(lines, [o], baseShipping));

  const benefit = (r: OffersResult) =>
    r.discount + (r.freeShipping ? round2(baseShipping) : 0);

  let best = candidates[0];
  for (const c of candidates) if (benefit(c) > benefit(best)) best = c;
  return best;
}
