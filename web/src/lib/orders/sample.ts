import type { OrderStatus } from "@/lib/design/status";
import type { ShopCategory } from "@/lib/catalog/samples";

/** Placeholder order data for the UI until BE order reads land. */
export interface SampleOrderLine {
  title: string;
  summary: string;
  lineTotal: number;
  pdfName?: string;
}
export interface SampleMessage {
  from: "shop" | "customer";
  body: string;
  at: string;
}
export interface SampleOrder {
  id: string;
  shopId: string;
  shopName: string;
  category: ShopCategory;
  itemsCount: number;
  total: number;
  status: OrderStatus;
  placedAt: string;
  eta?: string;
  lines: SampleOrderLine[];
  subtotal: number;
  delivery: number;
  messages: SampleMessage[];
}

export const sampleOrders: SampleOrder[] = [
  {
    id: "SR-1042",
    shopId: "pim-copy",
    shopName: "PIM Copy",
    category: "print",
    itemsCount: 3,
    total: 116.9,
    status: "pending",
    placedAt: "Acum 2 min",
    eta: "14:35",
    subtotal: 107.9,
    delivery: 9,
    lines: [
      { title: "Listare lucrare de licență", summary: "100 pag · Color · Spirală · Coperți transparente", lineTotal: 75, pdfName: "lucrare-licenta-final.pdf" },
      { title: "Pix Pilot G-2 0.7mm", summary: "Culoare: Albastru", lineTotal: 25.5 },
      { title: "Caiet A5 dictando", summary: "Coperți tari", lineTotal: 14.9 },
    ],
    messages: [
      { from: "shop", body: "Salut! Am primit comanda, începem imediat. 👋", at: "13:33" },
      { from: "shop", body: "Confirmi că vrei copertă albastră?", at: "13:33" },
      { from: "customer", body: "Da, albastră închisă vă rog", at: "13:34" },
    ],
  },
  {
    id: "SR-1041",
    shopId: "copy-center-tudor",
    shopName: "Copy Center Tudor",
    category: "copy",
    itemsCount: 1,
    total: 84,
    status: "in_progress",
    placedAt: "Acum 18 min",
    eta: "13:50",
    subtotal: 75,
    delivery: 9,
    lines: [
      { title: "Listare lucrare de licență", summary: "100 pag · Color · Spirală metalică · Coperți transparente", lineTotal: 75, pdfName: "lucrare-licenta-final.pdf" },
    ],
    messages: [
      { from: "shop", body: "Salut! Am primit comanda, începem imediat. 👋", at: "13:33" },
      { from: "customer", body: "Mulțumesc! Copertă albastră vă rog.", at: "13:34" },
      { from: "shop", body: "Sigur. ETA 13:50.", at: "13:35" },
    ],
  },
  {
    id: "SR-1039",
    shopId: "printhaus",
    shopName: "PrintHaus",
    category: "binding",
    itemsCount: 2,
    total: 52.3,
    status: "accepted",
    placedAt: "Acum 1 oră",
    eta: "13:10",
    subtotal: 43.3,
    delivery: 9,
    lines: [
      { title: "Legare termică A4", summary: "Până la 200 pagini · Copertă albă", lineTotal: 25 },
      { title: "Set 50 folii laminare", summary: "A4 · 80 microni", lineTotal: 18.3 },
    ],
    messages: [{ from: "shop", body: "Comanda a fost acceptată, o pregătim.", at: "12:20" }],
  },
  {
    id: "SR-1037",
    shopId: "pim-copy",
    shopName: "PIM Copy",
    category: "print",
    itemsCount: 1,
    total: 24,
    status: "done",
    placedAt: "Ieri, 16:42",
    subtotal: 15,
    delivery: 9,
    lines: [{ title: "Copii A4 alb-negru", summary: "60 pag · Față-verso", lineTotal: 15 }],
    messages: [{ from: "shop", body: "Comanda este gata și livrată. Mulțumim!", at: "17:05" }],
  },
  {
    id: "SR-1031",
    shopId: "birotica-independentei",
    shopName: "Birotica Independenței",
    category: "stationery",
    itemsCount: 2,
    total: 67.9,
    status: "rejected",
    placedAt: "Luni, 10:12",
    subtotal: 58.9,
    delivery: 9,
    lines: [{ title: "Set markere Stabilo", summary: "24 culori", lineTotal: 58.9 }],
    messages: [{ from: "shop", body: "Ne pare rău, produsul nu e momentan pe stoc.", at: "10:20" }],
  },
];

export function getSampleOrder(id: string): SampleOrder | undefined {
  return sampleOrders.find((o) => o.id === id || o.id === `SR-${id}` || id.includes(o.id));
}
