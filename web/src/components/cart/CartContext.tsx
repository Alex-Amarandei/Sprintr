"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { CartLine } from "@/lib/catalog/cart";

/** Identity of the shop a cart belongs to, captured when lines are added. */
export interface CartShop {
  id: string;
  name: string;
  /** Whether the shop was open when the line was added (drives checkout gating). */
  open: boolean;
}

interface CartContextValue {
  lines: CartLine[];
  shopId: string | null;
  shopName: string | null;
  /** Is the cart's shop currently open? `true` when the cart is empty. */
  shopOpen: boolean;
  count: number;
  total: number;
  addLine: (line: CartLine, shop: CartShop) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [shop, setShop] = useState<CartShop | null>(null);

  const value = useMemo<CartContextValue>(() => {
    const total =
      Math.round(lines.reduce((s, l) => s + l.total, 0) * 100) / 100;
    return {
      lines,
      shopId: shop?.id ?? null,
      shopName: shop?.name ?? null,
      shopOpen: shop?.open ?? true,
      count: lines.length,
      total,
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
      clear: () => {
        setLines([]);
        setShop(null);
      },
    };
  }, [lines, shop]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
