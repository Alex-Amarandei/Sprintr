import { Copy, Layers, PenTool, Printer, type LucideIcon } from "lucide-react";
import type { ShopCategory } from "@/lib/catalog/samples";

/** Shop category → header icon + on-palette gradient. Shared by ShopCard + shop profile. */
export const SHOP_CATEGORY: Record<
  ShopCategory,
  { icon: LucideIcon; gradient: string }
> = {
  print: {
    icon: Printer,
    gradient:
      "linear-gradient(135deg, var(--mantine-color-slate-8), var(--mantine-color-slate-5))",
  },
  copy: {
    icon: Copy,
    gradient:
      "linear-gradient(135deg, var(--mantine-color-brand-7), var(--mantine-color-brand-5))",
  },
  binding: {
    icon: Layers,
    gradient:
      "linear-gradient(135deg, var(--mantine-color-teal-8), var(--mantine-color-teal-5))",
  },
  stationery: {
    icon: PenTool,
    gradient:
      "linear-gradient(135deg, var(--mantine-color-ink-7), var(--mantine-color-slate-5))",
  },
};
