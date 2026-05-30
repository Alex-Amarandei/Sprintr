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
export interface SampleShop {
  id: string;
  name: string;
  description: string;
  address: string;
}

export const sampleShops: SampleShop[] = [
  {
    id: "pim-copy",
    name: "PIM Copy",
    description: "Editură & tipografie digitală, copiere, scanare și legătorie.",
    address: "Str. Lăpușneanu, Iași",
  },
  {
    id: "printhaus",
    name: "PrintHaus",
    description: "Cărți de vizită, flyere, bannere, roll-up și print UV.",
    address: "Șos. Ștefan cel Mare 4, Iași",
  },
];

export function getSampleShop(id: string): SampleShop | undefined {
  return sampleShops.find((s) => s.id === id);
}

/** Placeholder: every shop shows the same sample catalog for now. */
export function getSampleCatalog(_shopId: string): Item[] {
  return sampleCatalog;
}
