"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { CartLine } from "@/lib/catalog/cart";

interface CartContextValue {
  lines: CartLine[];
  shopId: string | null;
  count: number;
  total: number;
  addLine: (line: CartLine, shopId: string) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);

  const value = useMemo<CartContextValue>(() => {
    const total =
      Math.round(lines.reduce((s, l) => s + l.total, 0) * 100) / 100;
    return {
      lines,
      shopId,
      count: lines.length,
      total,
      addLine: (line, sid) => {
        // Different shop → clear cart and start fresh
        setShopId((prev) => {
          if (prev && prev !== sid) setLines([]);
          return sid;
        });
        setLines((prev) =>
          shopId && shopId !== sid ? [line] : [...prev, line]
        );
      },
      removeLine: (lineId) =>
        setLines((prev) => {
          const next = prev.filter((l) => l.lineId !== lineId);
          if (next.length === 0) setShopId(null);
          return next;
        }),
      clear: () => {
        setLines([]);
        setShopId(null);
      },
    };
  }, [lines, shopId]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
