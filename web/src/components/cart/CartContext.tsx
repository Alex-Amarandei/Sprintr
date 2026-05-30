"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { CartLine } from "@/lib/catalog/cart";

interface CartContextValue {
  lines: CartLine[];
  count: number;
  total: number;
  addLine: (line: CartLine) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const value = useMemo<CartContextValue>(() => {
    const total =
      Math.round(lines.reduce((s, l) => s + l.total, 0) * 100) / 100;
    return {
      lines,
      count: lines.length,
      total,
      addLine: (line) => setLines((prev) => [...prev, line]),
      removeLine: (lineId) =>
        setLines((prev) => prev.filter((l) => l.lineId !== lineId)),
      clear: () => setLines([]),
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
