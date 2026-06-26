"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toCartLineInput, type CartLine } from "@/lib/catalog/cart";
import { applyOffers, isOfferLive, toEngineOffer, type AppliedOffer } from "@/lib/catalog/offers";
import { listShopOffers, validateCode } from "@/lib/offers/api";
import type { OfferRow } from "@/lib/offers/types";

/** Status of the cart's typed promo code. */
export type PromoStatus = "idle" | "checking" | "valid" | "invalid";

const STORAGE_KEY = "sprintr.cart.v1";

type PersistedCart = { lines: CartLine[]; shop: CartShop | null };

function loadCart(): PersistedCart {
  if (typeof window === "undefined") return { lines: [], shop: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lines: [], shop: null };
    const parsed = JSON.parse(raw) as PersistedCart;
    if (!Array.isArray(parsed.lines)) return { lines: [], shop: null };
    // `files` are in-memory File objects — they can't be persisted, so any stored
    // line comes back without them. Force an empty array so the shape stays valid.
    const lines = parsed.lines
      .filter((l) => l && typeof l.lineId === "string")
      .map((l) => ({ ...l, files: [] }));
    return { lines, shop: parsed.shop ?? null };
  } catch {
    return { lines: [], shop: null };
  }
}

/** Strip in-memory File objects before persisting (they don't serialize). */
function serializeCart(lines: CartLine[], shop: CartShop | null): string {
  return JSON.stringify({
    lines: lines.map((l) => ({ ...l, files: [] })),
    shop,
  });
}

/** Identity of the shop a cart belongs to, captured when lines are added. */
export interface CartShop {
  id: string;
  name: string;
  /** Whether the shop was open when the line was added (drives checkout gating). */
  open: boolean;
  /** The shop's per-order delivery fee in lei (shown in checkout when delivery is chosen). */
  deliveryFee: number;
  /** Shop coordinates (owner-set) — drive the delivery-radius check at checkout. */
  lat: number | null;
  lng: number | null;
}

interface CartContextValue {
  lines: CartLine[];
  shopId: string | null;
  shopName: string | null;
  /** Is the cart's shop currently open? `true` when the cart is empty. */
  shopOpen: boolean;
  /** The cart shop's delivery fee in lei (0 when empty). */
  deliveryFee: number;
  /** Cart shop coordinates (null when empty or the shop hasn't set them). */
  shopLat: number | null;
  shopLng: number | null;
  count: number;
  /** Pre-discount subtotal (sum of line totals). */
  total: number;
  /** Goods discount from live automatic offers applied to the cart. */
  discount: number;
  /** total − discount (what the customer pays for goods, before shipping/fees). */
  payable: number;
  /** A live automatic free-shipping offer is in effect. */
  freeShipping: boolean;
  appliedOffers: AppliedOffer[];
  /** The promo code the customer typed in the cart (carried into checkout). */
  promoCode: string;
  /** Validation state of `promoCode` (drives the cart feedback message). */
  promoStatus: PromoStatus;
  /** The matched code-offer (also folded into the discount preview), or null. */
  promoOffer: OfferRow | null;
  /** Validate + apply a typed promo code against the cart's shop. */
  applyPromo: (code: string) => Promise<void>;
  /** Clear the typed promo code + its discount. */
  clearPromo: () => void;
  /** Discounted total for one line (for the strikethrough); falls back to its original. */
  lineFinal: (lineId: string) => number;
  addLine: (line: CartLine, shop: CartShop) => void;
  removeLine: (lineId: string) => void;
  /** Re-attach files to a line (e.g. a required upload lost after a reload). */
  attachFiles: (lineId: string, files: File[]) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Start empty so SSR and the first client render match; rehydrate from
  // localStorage after mount, then persist on every change.
  const [lines, setLines] = useState<CartLine[]>([]);
  const [shop, setShop] = useState<CartShop | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // Live automatic offers for the cart's shop (for the discount preview).
  const [offers, setOffers] = useState<OfferRow[]>([]);
  // Typed promo code + the matched code-offer (folded into the preview + carried to checkout).
  const [promoCode, setPromoCode] = useState("");
  const [promoStatus, setPromoStatus] = useState<PromoStatus>("idle");
  const [promoOffer, setPromoOffer] = useState<OfferRow | null>(null);

  useEffect(() => {
    const c = loadCart();
    setLines(c.lines);
    setShop(c.shop);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, serializeCart(lines, shop));
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, [lines, shop, hydrated]);

  // Warn before a full reload / tab close — but ONLY when a line carries in-memory attached files.
  // The cart lines themselves survive in localStorage, so warning on every refresh would be a pointless
  // scary dialog; the genuinely-lost state is the File objects (stripped on persist → must be re-attached).
  useEffect(() => {
    if (!hydrated) return;
    const hasUnsavedFiles = lines.some((l) => l.files && l.files.length > 0);
    if (!hasUnsavedFiles) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [lines, hydrated]);

  // Load the cart shop's live automatic offers so the cart can preview the discount.
  // Code-triggered offers are deliberately excluded (those apply only at checkout).
  const shopId = shop?.id ?? null;
  // A promo code is shop-specific — drop it whenever the cart's shop changes (or clears).
  useEffect(() => {
    setPromoCode("");
    setPromoStatus("idle");
    setPromoOffer(null);
  }, [shopId]);

  const applyPromo = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      setPromoCode(trimmed);
      if (!trimmed || !shopId) {
        setPromoStatus("idle");
        setPromoOffer(null);
        return;
      }
      setPromoStatus("checking");
      try {
        const offer = await validateCode(shopId, trimmed);
        if (offer && isOfferLive(offer)) {
          setPromoOffer(offer);
          setPromoStatus("valid");
        } else {
          setPromoOffer(null);
          setPromoStatus("invalid");
        }
      } catch {
        setPromoOffer(null);
        setPromoStatus("invalid");
      }
    },
    [shopId]
  );

  const clearPromo = useCallback(() => {
    setPromoCode("");
    setPromoStatus("idle");
    setPromoOffer(null);
  }, []);

  useEffect(() => {
    if (!shopId) {
      setOffers([]);
      return;
    }
    let cancelled = false;
    listShopOffers(shopId)
      .then((rows) => {
        if (!cancelled)
          setOffers(rows.filter((o) => o.trigger === "automatic" && isOfferLive(o)));
      })
      .catch(() => {
        if (!cancelled) setOffers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [shopId]);

  const value = useMemo<CartContextValue>(() => {
    const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
    const total = round2(lines.reduce((s, l) => s + l.total, 0));

    // Apply offers for a live preview (shipping handled separately at checkout → baseShipping 0).
    // A validated promo code's offer is folded in so its discount shows in the cart too.
    const previewOffers = promoOffer ? [...offers, promoOffer] : offers;
    const result =
      lines.length && previewOffers.length
        ? applyOffers(lines.map(toCartLineInput), previewOffers.map(toEngineOffer), 0)
        : null;
    const discount = result?.discount ?? 0;
    const lineMap = new Map((result?.lines ?? []).map((lr) => [lr.lineId, lr.finalTotal]));

    return {
      lines,
      shopId: shop?.id ?? null,
      shopName: shop?.name ?? null,
      shopOpen: shop?.open ?? true,
      deliveryFee: shop?.deliveryFee ?? 0,
      shopLat: shop?.lat ?? null,
      shopLng: shop?.lng ?? null,
      count: lines.length,
      total,
      discount,
      payable: round2(total - discount),
      freeShipping: result?.freeShipping ?? false,
      appliedOffers: result?.appliedOffers ?? [],
      promoCode,
      promoStatus,
      promoOffer,
      applyPromo,
      clearPromo,
      lineFinal: (lineId) =>
        lineMap.get(lineId) ?? lines.find((l) => l.lineId === lineId)?.total ?? 0,
      // Cross-shop conflicts are resolved by the UI (confirm + clear) BEFORE calling
      // this, so here we just append; `clear()` runs first when switching shops.
      addLine: (line, s) => {
        setShop(s);
        setLines((prev) => [...prev, line]);
      },
      removeLine: (lineId) =>
        setLines((prev) => {
          const next = prev.filter((l) => l.lineId !== lineId);
          if (next.length === 0) setShop(null);
          return next;
        }),
      attachFiles: (lineId, files) =>
        setLines((prev) => prev.map((l) => (l.lineId === lineId ? { ...l, files } : l))),
      clear: () => {
        setLines([]);
        setShop(null);
      },
    };
  }, [lines, shop, offers, promoCode, promoStatus, promoOffer, applyPromo, clearPromo]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
