import type { Item } from "./schema";

/** Demo item matching the worked example (CLAUDE.md §9): pages × b&w, color per page,
 *  flat binding + flat duplex. Used by the login-free renderer demo. */
export const samplePrintService: Item = {
  id: "sample-print",
  kind: "service",
  title: "Listare documente",
  description: "Încarcă un PDF și configurează tipărirea.",
  image_path: null,
  is_active: true,
  sort_order: 0,
  base_price: 0,
  requires_upload: true,
  stock_display: "none",
  inventory_item_id: null,
  category_id: null,
  fields: [
    {
      key: "pagini",
      label: "Pagini",
      type: "number",
      required: true,
      help: "Numărul de pagini de tipărit",
      default: 1,
      min: 1,
      max: null,
      step: 1,
      unit: "pagini",
      price: { mode: "per_unit", amount: 0.25, per: "pagini" },
    },
    {
      key: "culoare",
      label: "Tip tipărire",
      type: "single_select",
      required: true,
      help: null,
      default: "bw",
      options: [
        { value: "bw", label: "Alb-negru" },
        {
          value: "color",
          label: "Color",
          price: { mode: "per_unit", amount: 1.0, per: "pagini" },
        },
      ],
    },
    {
      key: "culoare_hartie",
      label: "Culoare hârtie",
      type: "single_select",
      required: true,
      help: "Culoarea colii pe care se tipărește",
      default: "alb",
      options: [
        { value: "alb", label: "Alb", swatch: "#ffffff" },
        {
          value: "crem",
          label: "Crem",
          swatch: "#f5f5dc",
          price: { mode: "additive", amount: 2 },
        },
        {
          value: "albastru",
          label: "Albastru",
          swatch: "#cfe2ff",
          price: { mode: "additive", amount: 2 },
        },
        {
          value: "roz",
          label: "Roz",
          swatch: "#ffd6e7",
          price: { mode: "additive", amount: 2 },
        },
      ],
    },
    {
      key: "fata_verso",
      label: "Față-verso",
      type: "boolean",
      required: false,
      help: null,
      default: false,
      price: { mode: "additive", amount: 5 },
    },
    {
      key: "legatorie",
      label: "Legătorie",
      type: "single_select",
      required: true,
      help: null,
      default: "fara",
      options: [
        { value: "fara", label: "Fără" },
        { value: "spira", label: "Spiră", price: { mode: "additive", amount: 10 } },
        {
          value: "carton",
          label: "Copertă cartonată",
          price: { mode: "additive", amount: 20 },
        },
      ],
    },
    {
      key: "observatii",
      label: "Observații",
      type: "text",
      required: false,
      help: "Cerințe speciale (opțional)",
      default: null,
    },
  ],
};

/** Zero-config product → adds straight to the cart (no modal). */
export const samplePencil: Item = {
  id: "sample-pencil",
  kind: "product",
  title: "Creion grafit HB",
  description: "Creion simplu, livrat la bucată.",
  image_path: null,
  is_active: true,
  sort_order: 1,
  base_price: 2.5,
  requires_upload: false,
  stock_display: "none",
  inventory_item_id: null,
  category_id: null,
  fields: [],
};

/** Product WITH config (quantity) → opens the modal, no upload. */
export const sampleNotebook: Item = {
  id: "sample-notebook",
  kind: "product",
  title: "Caiet A5 personalizat",
  description: "Caiet cu copertă personalizată.",
  image_path: null,
  is_active: true,
  sort_order: 2,
  base_price: 0,
  requires_upload: false,
  stock_display: "none",
  inventory_item_id: null,
  category_id: null,
  fields: [
    {
      key: "cantitate",
      label: "Cantitate",
      type: "number",
      required: true,
      help: null,
      default: 1,
      min: 1,
      max: null,
      step: 1,
      unit: "buc",
      price: { mode: "per_unit", amount: 12, per: "cantitate" },
    },
    {
      key: "coperta",
      label: "Copertă",
      type: "single_select",
      required: true,
      help: null,
      default: "soft",
      options: [
        { value: "soft", label: "Soft" },
        { value: "hard", label: "Cartonată", price: { mode: "additive", amount: 8 } },
      ],
    },
  ],
};

/** All sample items. */
export const sampleCatalog: Item[] = [
  samplePencil,
  sampleNotebook,
  samplePrintService,
];

// ---- Sample shops (placeholder until backend reads land) ------------------
/** Visual category — drives the card's icon + gradient. */
export type ShopCategory = "print" | "copy" | "binding" | "stationery";

export interface SampleShop {
  id: string;
  name: string;
  description: string;
  address: string;
  // Optional display fields (placeholder; BE may omit → card degrades gracefully).
  category?: ShopCategory;
  rating?: number;
  reviews?: number;
  /** Delivery estimate, e.g. "25–35 min". */
  eta?: string;
  tags?: string[];
  isOpen?: boolean;
  /** When closed, the next opening time, e.g. "09:00". */
  opensAt?: string;
  phone?: string;
}

export const sampleShops: SampleShop[] = [
  {
    id: "pim-copy",
    name: "PIM Copy",
    description: "Editură & tipografie digitală, copiere, scanare și legătorie.",
    address: "Str. Lăpușneanu, Iași",
    category: "print",
    rating: 4.9,
    reviews: 320,
    eta: "25–35 min",
    tags: ["Licențe", "Color", "Spiră"],
    isOpen: true,
    phone: "+40 232 123 456",
  },
  {
    id: "printhaus",
    name: "PrintHaus",
    description: "Cărți de vizită, flyere, bannere, roll-up și print UV.",
    address: "Șos. Ștefan cel Mare 4, Iași",
    category: "binding",
    rating: 4.7,
    reviews: 180,
    eta: "30–40 min",
    tags: ["Bannere", "UV", "Flyere"],
    isOpen: true,
    phone: "+40 232 222 111",
  },
  {
    id: "copy-center-tudor",
    name: "Copy Center Tudor",
    description: "Color, A3, legare spirală și termică lângă Tudor Vladimirescu.",
    address: "Bd. Tudor Vladimirescu 18, Iași",
    category: "copy",
    rating: 4.8,
    reviews: 210,
    eta: "20–30 min",
    tags: ["Color", "A3"],
    isOpen: false,
    opensAt: "09:00",
    phone: "+40 232 333 222",
  },
  {
    id: "birotica-independentei",
    name: "Birotica Independenței",
    description: "Pixuri, caiete, markere, post-it și consumabile de birou.",
    address: "Str. Independenței 7, Iași",
    category: "stationery",
    rating: 4.6,
    reviews: 92,
    eta: "40–50 min",
    tags: ["Pixuri", "Caiete", "Post-it"],
    isOpen: true,
    phone: "+40 232 444 333",
  },
];

export function getSampleShop(id: string): SampleShop | undefined {
  return sampleShops.find((s) => s.id === id);
}

/** Placeholder: every shop shows the same sample catalog for now. */
export function getSampleCatalog(_shopId: string): Item[] {
  return sampleCatalog;
}
