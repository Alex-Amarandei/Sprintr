/**
 * PIM Copy seed builder.
 *
 * Builds the catalog `document` JSON for the real PIM Copy locations in Iași from data
 * crawled off pimcopy.ro (product options) + the official price list PDF
 * (preturi_tipografia_pim.pdf, 1.09.2025) and the published retail prices (metal-spiral
 * binding, cutter plotter). Every document is validated against the live Zod schema so a
 * seeded catalog is guaranteed to `parseDocument()` cleanly.
 *
 * Pricing policy (per the shop owner):
 *  - Production / copy / binding / lamination / print → priced from the official PDF.
 *  - Metal-spiral binding + cutter plotter → published retail prices.
 *  - Merch & finished retail with NO published price (t-shirts, mugs, engraving, badges,
 *    business cards, stickers, banners, roll-ups, flyers) → seeded with their real options
 *    but base_price 0 and in_stock=false (hidden from ordering until the shop sets prices).
 *
 * Run:  bun run seed/build-pim.ts   (from web/)
 * Emits: seed/derived/pim-*.catalog.json  +  seed/pim-seed.sql
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { catalogDocumentSchema, type CatalogDocument } from "../src/lib/catalog/schema";
import type { WeeklySchedule } from "../src/lib/shop/schedule";

export const OWNER_PROFILE_ID = "ee9c3155-1c5f-4e78-aadb-325935efe58e"; // alex.m.amarandei@gmail.com
export const OLD_PIM_SHOP_ID = "6596de4b-52d9-4bad-a0e3-b0cc491b51e5";
export const LOGO = "https://pimcopy.ro/assets/images/logo.png";
const IMG = (n: string) => `https://pimcopy.ro/assets/servicii/${n}.png`;

// ── Field/item helpers ───────────────────────────────────────────────────────
type Prices = { a4: number; b5: number; a5: number; b6: number; a6: number };
const FMT: (keyof Prices)[] = ["a4", "b5", "a5", "b6", "a6"];
const FMT_LABEL: Record<keyof Prices, string> = { a4: "A4", b5: "B5", a5: "A5", b6: "B6", a6: "A6" };

function formatField(prices: Prices) {
  return {
    key: "format",
    type: "single_select",
    label: "Format",
    required: true,
    default: "a4",
    options: FMT.map((f, i) => ({
      value: f,
      label: FMT_LABEL[f],
      price: { mode: "additive", amount: prices[f] },
      ...(i === 0 ? { default: true } : {}),
    })),
  };
}
function qtyField(label: string, unit: string, def = 1) {
  return { key: "cantitate", type: "number", label, required: true, default: def, min: 1, step: 1, unit, is_quantity: true };
}
function sel(key: string, label: string, options: { value: string; label: string; amount?: number }[], required = true) {
  return {
    key,
    type: "single_select",
    label,
    required,
    default: options[0]?.value ?? null,
    options: options.map((o, i) => ({
      value: o.value,
      label: o.label,
      ...(o.amount != null ? { price: { mode: "additive", amount: o.amount } } : {}),
      ...(i === 0 ? { default: true } : {}),
    })),
  };
}

let sortSeq = 0;
const PRINT_FILES = ["pdf", "image", "word"];

/** Active, per-format priced service. */
function svcFmt(o: {
  id: string; title: string; desc: string; cat: string; prices: Prices;
  qtyLabel: string; qtyUnit: string; upload?: boolean; images?: string[];
}) {
  return {
    id: o.id, kind: "service", title: o.title, description: o.desc,
    images: o.images ?? [], is_active: true, in_stock: true, sort_order: sortSeq++,
    base_price: 0, min_quantity: 1, requires_upload: o.upload ?? true,
    accepted_file_types: o.upload ? PRINT_FILES : ["pdf", "image"],
    category_id: o.cat,
    fields: [formatField(o.prices), qtyField(o.qtyLabel, o.qtyUnit)],
  };
}
/** Active, single flat-price service (no format dimension). */
function svcFlat(o: { id: string; title: string; desc: string; cat: string; price: number; qtyLabel: string; qtyUnit: string }) {
  return {
    id: o.id, kind: "service", title: o.title, description: o.desc,
    images: [], is_active: true, in_stock: true, sort_order: sortSeq++,
    base_price: o.price, min_quantity: 1, requires_upload: true,
    accepted_file_types: ["pdf", "image"], category_id: o.cat,
    fields: [qtyField(o.qtyLabel, o.qtyUnit)],
  };
}
/** Active service whose price comes from a custom select (e.g. spiral size, plotter format). */
function svcSelect(o: {
  id: string; title: string; desc: string; cat: string;
  select: ReturnType<typeof sel>; qtyLabel: string; qtyUnit: string;
  upload?: boolean; images?: string[];
}) {
  return {
    id: o.id, kind: "service", title: o.title, description: o.desc,
    images: o.images ?? [], is_active: true, in_stock: true, sort_order: sortSeq++,
    base_price: 0, min_quantity: 1, requires_upload: o.upload ?? true,
    accepted_file_types: o.upload ? PRINT_FILES : ["pdf", "image"], category_id: o.cat,
    fields: [o.select, qtyField(o.qtyLabel, o.qtyUnit)],
  };
}
/** Hidden retail/merch item: real options, no price yet (base 0, in_stock=false). */
function retail(o: {
  id: string; title: string; desc: string; cat: string;
  selects: ReturnType<typeof sel>[]; images?: string[]; minQty?: number;
  qtyLabel?: string; qtyUnit?: string; upload?: boolean;
}) {
  return {
    id: o.id, kind: "service", title: o.title, description: o.desc,
    images: o.images ?? [], is_active: true, in_stock: false, sort_order: sortSeq++,
    base_price: 0, min_quantity: o.minQty ?? 1, requires_upload: o.upload ?? true,
    accepted_file_types: ["pdf", "image"], category_id: o.cat,
    fields: [...o.selects, qtyField(o.qtyLabel ?? "Cantitate", o.qtyUnit ?? "buc.", o.minQty ?? 1)],
  };
}

const validate = (doc: unknown): CatalogDocument => catalogDocumentSchema.parse(doc);

// ── Shared price tables (from the official PDF) ──────────────────────────────
const P_AN: Prices = { a4: 0.03, b5: 0.023, a5: 0.015, b6: 0.0115, a6: 0.0075 };
const P_COLOR: Prices = { a4: 0.1576, b5: 0.1156, a5: 0.0788, b6: 0.0578, a6: 0.0394 };
const P_ALBUM: Prices = { a4: 0.35, b5: 0.2626, a5: 0.175, b6: 0.1313, a6: 0.0875 };
const P_LAM: Prices = { a4: 0.56, b5: 0.45, a5: 0.33, b6: 0.24, a6: 0.21 };
const P_BROSARE: Prices = { a4: 0.56, b5: 0.45, a5: 0.43, b6: 0.33, a6: 0.23 };
const P_CAPSARE: Prices = { a4: 0.74, b5: 0.66, a5: 0.62, b6: 0.49, a6: 0.36 };

// Romanian VAT. The official PDF prices are listed *fără TVA*; consumer prices must include it.
// Books (Editură) = 11% reduced rate; other print/copy services (copy shops) = 21% standard.
// (Published retail prices already on the website — metal spiral, cutter plotter — are left as-is.)
const VAT_BOOK = 1.11;
const VAT_STD = 1.21;
const r4 = (n: number) => Math.round(n * 10000) / 10000;
const vat = (p: Prices, f: number): Prices => ({ a4: r4(p.a4 * f), b5: r4(p.b5 * f), a5: r4(p.a5 * f), b6: r4(p.b6 * f), a6: r4(p.a6 * f) });

// ── COPY shops (Smârdan, Tudor, Independenței) — shared catalog ──────────────
function buildCopy(): CatalogDocument {
  sortSeq = 0;
  const doc = {
    schema_version: 1,
    categories: [
      { id: "print", name: "Printare & copiere", sort_order: 1 },
      { id: "legatorie", name: "Legătorie & finisare", sort_order: 2 },
      { id: "print-mare", name: "Print mare & afișaj", sort_order: 3 },
      { id: "retail", name: "Tipărituri & retail", sort_order: 4 },
    ],
    items: [
      svcFmt({ id: "print-an", title: "Printare & copiere alb-negru", desc: "Print sau copie alb-negru, preț pe pagină (TVA inclus).", cat: "print", prices: vat(P_AN, VAT_STD), qtyLabel: "Număr de pagini", qtyUnit: "pag.", upload: true }),
      svcFmt({ id: "print-color", title: "Printare & copiere color", desc: "Print sau copie color, preț pe pagină (TVA inclus).", cat: "print", prices: vat(P_COLOR, VAT_STD), qtyLabel: "Număr de pagini", qtyUnit: "pag.", upload: true }),
      svcFmt({ id: "print-album", title: "Printare color foto / album", desc: "Print color de calitate foto, preț pe pagină (TVA inclus).", cat: "print", prices: vat(P_ALBUM, VAT_STD), qtyLabel: "Număr de pagini", qtyUnit: "pag.", upload: true }),
      svcFmt({ id: "laminare-lucioasa", title: "Laminare lucioasă", desc: "Laminare lucioasă, preț pe coală (TVA inclus).", cat: "legatorie", prices: vat(P_LAM, VAT_STD), qtyLabel: "Număr de coli", qtyUnit: "coli" }),
      svcFmt({ id: "laminare-mata", title: "Laminare mată", desc: "Laminare mată, preț pe coală (TVA inclus).", cat: "legatorie", prices: vat(P_LAM, VAT_STD), qtyLabel: "Număr de coli", qtyUnit: "coli" }),
      svcSelect({
        id: "arc-metalic", title: "Legare cu arc metalic (spirală)", desc: "Legare cu spirală metalică, în funcție de grosime.", cat: "legatorie",
        select: sel("grosime", "Grosime", [
          { value: "pana80", label: "Până la 80 file", amount: 1.5 },
          { value: "80-160", label: "80 - 160 file", amount: 2.0 },
          { value: "peste160", label: "Peste 160 file", amount: 2.5 },
        ]),
        qtyLabel: "Exemplare", qtyUnit: "buc.",
      }),
      svcFmt({ id: "brosare", title: "Broșare", desc: "Broșare, preț pe exemplar (TVA inclus).", cat: "legatorie", prices: vat(P_BROSARE, VAT_STD), qtyLabel: "Exemplare", qtyUnit: "buc." }),
      svcFmt({ id: "capsare", title: "Capsare", desc: "Capsare, preț pe exemplar (TVA inclus).", cat: "legatorie", prices: vat(P_CAPSARE, VAT_STD), qtyLabel: "Exemplare", qtyUnit: "buc." }),
      // Hidden retail (no published price yet) — real options preserved.
      {
        id: "scanare", kind: "service", title: "Scanare documente", description: "Scanare alb-negru sau color a documentelor aduse în locație.",
        images: [], is_active: true, in_stock: false, sort_order: sortSeq++, base_price: 0, min_quantity: 1,
        requires_upload: false, accepted_file_types: ["pdf", "image"], category_id: "retail",
        fields: [sel("tip", "Tip scanare", [{ value: "an", label: "Alb-negru" }, { value: "color", label: "Color" }]), qtyField("Pagini", "pag.")],
      },
      retail({
        id: "carti-vizita", title: "Cărți de vizită", desc: "Cărți de vizită personalizate, carton 250g.", cat: "retail",
        selects: [
          sel("print", "Tipar", [{ value: "fata", label: "Față" }, { value: "fata-verso", label: "Față-verso" }]),
          sel("carton", "Carton 250g", [{ value: "lucios", label: "Lucios" }, { value: "mat", label: "Mat" }]),
          sel("laminare", "Laminare", [{ value: "fara", label: "Fără" }, { value: "lucioasa", label: "Lucioasă" }, { value: "mata", label: "Mată" }]),
        ],
        images: ["carti-vizita-1", "carti-vizita-2", "carti-vizita-3", "carti-vizita-4"].map(IMG),
        minQty: 100, qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "stickere", title: "Stickere / Etichete", desc: "Stickere și etichete autocolante, decupate la dimensiune.", cat: "retail",
        selects: [
          sel("format", "Format", [{ value: "a4", label: "A4" }, { value: "a3", label: "A3" }]),
          sel("material", "Material", [{ value: "hartie", label: "Hârtie autocolantă" }, { value: "vinil-alb", label: "Vinil alb opac" }, { value: "vinil-transparent", label: "Vinil transparent" }]),
        ],
        images: ["eticheta-1", "eticheta-2", "eticheta-3", "eticheta-4"].map(IMG),
        qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "roll-up", title: "Roll-up banner", desc: "Roll-up publicitar cu sistem de prindere.", cat: "retail",
        selects: [
          sel("inaltime", "Înălțime", [{ value: "85x200", label: "85 x 200 cm" }, { value: "100x200", label: "100 x 200 cm" }]),
          sel("mecanism", "Mecanism", [{ value: "cu", label: "Cu mecanism" }, { value: "fara", label: "Doar print (fără mecanism)" }]),
        ],
        images: ["rollup-1", "rollup-2", "rollup-3", "rollup-4"].map(IMG),
        qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "bannere", title: "Bannere publicitare", desc: "Bannere print pe prelată, finisate.", cat: "retail",
        selects: [
          sel("format", "Format", [
            { value: "a2", label: "A2" }, { value: "a1", label: "A1" }, { value: "a0", label: "A0" },
            { value: "b2", label: "B2" }, { value: "b1", label: "B1" }, { value: "b0", label: "B0" },
          ]),
          sel("finisare", "Finisare", [{ value: "capse", label: "Capse" }, { value: "buzunare", label: "Buzunare" }, { value: "gauri-vant", label: "Găuri de vânt" }]),
        ],
        qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "flyere", title: "Flyere & pliante", desc: "Flyere și pliante publicitare, hârtie lucioasă.", cat: "retail",
        selects: [
          sel("format", "Format", [{ value: "a6", label: "A6" }, { value: "a5", label: "A5" }, { value: "a4", label: "A4" }]),
          sel("hartie", "Hârtie", [{ value: "135g", label: "135g lucioasă" }, { value: "170g", label: "170g lucioasă" }]),
        ],
        minQty: 50, qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "fotografii", title: "Fotografii digitale", desc: "Printare foto pe carton 250g, formate mici.", cat: "retail",
        selects: [
          sel("dimensiune", "Dimensiune", [{ value: "12x17", label: "12 x 17 cm" }, { value: "11x15", label: "11 x 15 cm" }, { value: "10x15", label: "10 x 15 cm" }, { value: "9x12", label: "9 x 12 cm" }]),
          sel("carton", "Carton 250g", [{ value: "lucios", label: "Lucios" }, { value: "mat", label: "Mat" }]),
        ],
        images: ["poza-digitala-1", "poza-digitala-2", "poza-digitala-3", "poza-digitala-4"].map(IMG),
        qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "mape", title: "Mape cu buzunar", desc: "Mape personalizate din carton dublu cretat mat.", cat: "retail",
        selects: [
          sel("tipar", "Tipar", [{ value: "fata", label: "Față" }, { value: "fata-verso", label: "Față-verso" }]),
          sel("pliere", "Pliere", [{ value: "big-simplu", label: "Big simplu" }, { value: "big-dublu", label: "Big dublu" }]),
          sel("laminare", "Laminare", [{ value: "fara", label: "Fără" }, { value: "lucioasa", label: "Lucioasă" }, { value: "mata", label: "Mată" }]),
        ],
        images: ["mapa-1", "mapa-2", "mapa-3", "mapa-4"].map(IMG),
        qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "plicuri", title: "Plicuri personalizate", desc: "Plicuri siliconice albe 80g, personalizate.", cat: "retail",
        selects: [sel("format", "Format", [{ value: "dl", label: "DL (110 x 220 mm)" }, { value: "c5", label: "C5 (162 x 229 mm)" }, { value: "c4", label: "C4 (229 x 324 mm)" }])],
        images: ["plic-1", "plic-2", "plic-3", "plic-4"].map(IMG),
        qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "printuri-mari", title: "Printuri dimensiuni mari", desc: "Print format mare pentru interior și exterior, pe diverse suporturi.", cat: "print-mare",
        selects: [
          sel("format", "Format", [{ value: "a2", label: "A2" }, { value: "a1", label: "A1" }, { value: "a0", label: "A0" }, { value: "b2", label: "B2" }, { value: "b1", label: "B1" }, { value: "b0", label: "B0" }, { value: "nonstandard", label: "Non-standard" }]),
          sel("suport", "Suport", [
            { value: "carton-150", label: "Carton 150g (whiteback)" }, { value: "vinil-alb", label: "Autocolant vinil alb (PVC)" },
            { value: "vinil-perforat", label: "Autocolant vinil perforat (PVC)" }, { value: "canvas-lucios", label: "Canvas sintetic lucios" },
            { value: "canvas-mat", label: "Canvas bumbac mat" }, { value: "mesh", label: "Mesh" }, { value: "tapet", label: "Tapet" },
          ]),
        ],
        images: ["listare-indoor-outdoor-1", "listare-indoor-outdoor-2", "listare-indoor-outdoor-3", "listare-indoor-outdoor-4"].map(IMG),
        qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "planse", title: "Planșe", desc: "Listare planșe format mare, cu pliere opțională.", cat: "print-mare",
        selects: [
          sel("format", "Format", [{ value: "a4", label: "A4" }, { value: "a3", label: "A3" }, { value: "a2", label: "A2" }, { value: "a1", label: "A1" }, { value: "a0", label: "A0" }, { value: "nonstandard", label: "Non-standard" }]),
          sel("pliere", "Pliere", [{ value: "fara", label: "Fără pliere" }, { value: "cu", label: "Cu pliere" }]),
        ],
        images: ["planse-1", "planse-2", "planse-3", "planse-4"].map(IMG),
        qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "brosuri-capsate", title: "Broșuri capsate", desc: "Broșuri capsate în diverse formate.", cat: "retail",
        selects: [sel("format", "Format", [{ value: "a5-landscape", label: "A5 landscape" }, { value: "a5-portrait", label: "A5 portrait" }, { value: "20x20", label: "20 x 20 cm" }, { value: "a4", label: "A4" }])],
        images: [], qtyLabel: "Exemplare", qtyUnit: "buc.",
      }),
      retail({
        id: "calendare", title: "Calendare", desc: "Calendare personalizate de birou, perete sau buzunar.", cat: "retail",
        selects: [sel("tip", "Tip", [{ value: "birou", label: "De birou" }, { value: "perete-a3", label: "De perete A3, datat lunar" }, { value: "buzunar", label: "De buzunar" }])],
        images: [], qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "agende", title: "Agende personalizate", desc: "Agende personalizate, datate sau nedatate.", cat: "retail",
        selects: [sel("tip", "Tip", [{ value: "nedatata", label: "Nedatată (80 foi)" }, { value: "saptamanal", label: "Datată săptămânal (75 foi)" }, { value: "zilnic", label: "Datată zilnic (185 foi)" }])],
        images: [], qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
    ],
  };
  return validate(doc);
}

// ── PERSONALIZARE (Smârdan department) ───────────────────────────────────────
function buildPerso(): CatalogDocument {
  sortSeq = 0;
  const doc = {
    schema_version: 1,
    categories: [
      { id: "print-mare", name: "Print mare & decupare", sort_order: 1 },
      { id: "textile", name: "Textile", sort_order: 2 },
      { id: "obiecte", name: "Obiecte personalizate", sort_order: 3 },
    ],
    items: [
      svcSelect({
        id: "cutter-plotter", title: "Decupare cutter plotter", desc: "Decupare contur cu plotter de cutter, preț pe format.", cat: "print-mare",
        select: sel("format", "Format", [
          { value: "a3", label: "A3", amount: 2.5 },
          { value: "a2", label: "A2", amount: 5 },
          { value: "a1", label: "A1", amount: 10 },
          { value: "a0", label: "A0+", amount: 20 },
        ]),
        qtyLabel: "Bucăți", qtyUnit: "buc.", upload: true,
      }),
      retail({
        id: "tricouri", title: "Tricouri personalizate", desc: "Tricouri cu print personalizat.", cat: "textile",
        selects: [
          sel("marime", "Mărime", [{ value: "s", label: "S" }, { value: "m", label: "M" }, { value: "l", label: "L" }, { value: "xl", label: "XL" }, { value: "xxl", label: "XXL" }]),
          sel("culoare", "Culoare", [{ value: "alb", label: "Alb" }, { value: "negru", label: "Negru" }]),
        ],
        images: ["tricou-1", "tricou-2", "tricou-3", "tricou-4"].map(IMG),
        qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "cani", title: "Căni personalizate", desc: "Căni cu print personalizat.", cat: "obiecte",
        selects: [
          sel("tip", "Tip cană", [
            { value: "alba", label: "Albă" }, { value: "interior-color", label: "Interior colorat" },
            { value: "termosensibila", label: "Termosensibilă (magică)" }, { value: "inima", label: "În formă de inimă" },
          ]),
        ],
        images: ["cani-personalizate-1", "cani-personalizate-2", "cani-personalizate-3", "cani-personalizate-4"].map(IMG),
        qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "insigne", title: "Insigne (badge-uri)", desc: "Insigne personalizate cu print.", cat: "obiecte",
        selects: [sel("diametru", "Diametru", [{ value: "25", label: "25 mm" }, { value: "37", label: "37 mm" }, { value: "58", label: "58 mm" }])],
        minQty: 10, qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "sepci", title: "Șepci personalizate", desc: "Șepci cu print personalizat.", cat: "textile",
        selects: [sel("culoare", "Culoare", [{ value: "alb", label: "Alb" }, { value: "negru", label: "Negru" }, { value: "albastru-marin", label: "Albastru-marin" }])],
        images: ["sepci-1", "sepci-2", "sepci-3", "sepci-4"].map(IMG),
        qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "sacosa", title: "Sacoșă din bumbac", desc: "Sacoșe din bumbac personalizate, format A4.", cat: "textile",
        selects: [], images: ["sacosa-1", "sacosa-2", "sacosa-3", "sacosa-4"].map(IMG),
        qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "puzzle", title: "Puzzle personalizat", desc: "Puzzle personalizat, din carton sau magnetic.", cat: "obiecte",
        selects: [
          sel("tip", "Tip", [{ value: "carton", label: "Carton" }, { value: "magnetic", label: "Magnetic" }]),
          sel("format", "Format", [{ value: "a5", label: "A5" }, { value: "a4", label: "A4" }]),
        ],
        images: ["puzzle-1", "puzzle-2", "puzzle-3", "puzzle-4"].map(IMG),
        qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "pixuri", title: "Pixuri personalizate", desc: "Pixuri personalizate prin print UV sau gravare laser.", cat: "obiecte",
        selects: [sel("tip", "Tip", [{ value: "plastic-uv", label: "Pix plastic, print UV" }, { value: "metalic-gravat", label: "Pix metalic, gravat laser" }])],
        images: ["pix-1", "pix-2", "pix-3", "pix-4"].map(IMG),
        qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "ecuson-gravat", title: "Ecuson gravat laser", desc: "Ecusoane gravate laser, 7 x 2.5 cm.", cat: "obiecte",
        selects: [], images: ["ecuson-1", "ecuson-2", "ecuson-3", "ecuson-4"].map(IMG),
        qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "stampila", title: "Ștampilă", desc: "Ștampile personalizate, diverse forme și dimensiuni.", cat: "obiecte",
        selects: [sel("forma", "Placheta", [
          { value: "rotund-25", label: "Rotundă 25 mm" }, { value: "rotund-42", label: "Rotundă 42 mm" },
          { value: "dreptunghi-47x18", label: "Dreptunghi 47 x 18 mm" }, { value: "dreptunghi-38x14", label: "Dreptunghi 38 x 14 mm (buzunar)" },
        ])],
        images: ["stampila-1", "stampila-2", "stampila-3", "stampila-4"].map(IMG),
        qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "bricheta", title: "Brichetă personalizată", desc: "Brichete personalizate prin print UV.", cat: "obiecte",
        selects: [sel("personalizare", "Personalizare", [{ value: "o-fata", label: "O față" }, { value: "ambele", label: "Ambele fețe" }])],
        images: ["bricheta-1", "bricheta-2", "bricheta-3", "bricheta-4"].map(IMG),
        qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
      retail({
        id: "placa-parcare", title: "Placă de parcare", desc: "Plăcuțe de parcare personalizate, 30 x 42 cm.", cat: "obiecte",
        selects: [], images: ["placa-parcare-1", "placa-parcare-2", "placa-parcare-3", "placa-parcare-4"].map(IMG),
        qtyLabel: "Bucăți", qtyUnit: "buc.",
      }),
    ],
  };
  return validate(doc);
}

// ── EDITURĂ & TIPOGRAFIE (full official PDF pricing) ─────────────────────────
function buildEditura(): CatalogDocument {
  sortSeq = 0;
  const doc = {
    schema_version: 1,
    categories: [
      { id: "printare", name: "Printare interior", sort_order: 1 },
      { id: "finisare", name: "Laminare & finisare", sort_order: 2 },
      { id: "legare", name: "Legare", sort_order: 3 },
      { id: "coperti", name: "Coperți", sort_order: 4 },
    ],
    items: [
      svcFmt({ id: "e-print-an", title: "Printare interior alb-negru", desc: "Print interior alb-negru, preț pe pagină (TVA 11% inclus).", cat: "printare", prices: vat(P_AN, VAT_BOOK), qtyLabel: "Pagini", qtyUnit: "pag.", upload: true }),
      svcFmt({ id: "e-print-color", title: "Printare interior color", desc: "Print interior color, preț pe pagină (TVA 11% inclus).", cat: "printare", prices: vat(P_COLOR, VAT_BOOK), qtyLabel: "Pagini", qtyUnit: "pag.", upload: true }),
      svcFmt({ id: "e-print-album", title: "Printare color album", desc: "Print color album, preț pe pagină (TVA 11% inclus).", cat: "printare", prices: vat(P_ALBUM, VAT_BOOK), qtyLabel: "Pagini", qtyUnit: "pag.", upload: true }),
      svcFmt({ id: "e-lam-lucioasa", title: "Laminare lucioasă", desc: "Laminare lucioasă, preț pe coală (TVA 11% inclus).", cat: "finisare", prices: vat(P_LAM, VAT_BOOK), qtyLabel: "Coli", qtyUnit: "coli" }),
      svcFmt({ id: "e-lam-mata", title: "Laminare mată", desc: "Laminare mată, preț pe coală (TVA 11% inclus).", cat: "finisare", prices: vat(P_LAM, VAT_BOOK), qtyLabel: "Coli", qtyUnit: "coli" }),
      svcFmt({ id: "e-lam-soft", title: "Laminare soft touch", desc: "Laminare soft touch, preț pe coală (TVA 11% inclus).", cat: "finisare", prices: vat({ a4: 2.20, b5: 1.80, a5: 1.28, b6: 0.90, a6: 0.64 }, VAT_BOOK), qtyLabel: "Coli", qtyUnit: "coli" }),
      svcFmt({ id: "e-brosare", title: "Broșare", desc: "Broșare, preț pe exemplar (TVA 11% inclus).", cat: "finisare", prices: vat(P_BROSARE, VAT_BOOK), qtyLabel: "Exemplare", qtyUnit: "buc." }),
      svcFmt({ id: "e-capsare", title: "Capsare", desc: "Capsare, preț pe exemplar (TVA 11% inclus).", cat: "finisare", prices: vat(P_CAPSARE, VAT_BOOK), qtyLabel: "Exemplare", qtyUnit: "buc." }),
      svcFlat({ id: "e-clapite", title: "Clăpițe", desc: "Clăpițe, preț pe exemplar (TVA 11% inclus).", cat: "finisare", price: r4(0.87 * VAT_BOOK), qtyLabel: "Exemplare", qtyUnit: "buc." }),
      svcFmt({ id: "e-coasere", title: "Coasere fascicol (3-6 foi)", desc: "Coasere fascicol, preț pe exemplar (TVA 11% inclus).", cat: "finisare", prices: vat({ a4: 0.21, b5: 0.19, a5: 0.14, b6: 0.14, a6: 0.14 }, VAT_BOOK), qtyLabel: "Exemplare", qtyUnit: "buc." }),
      svcFlat({ id: "e-tiplare", title: "Țiplare carte în folie", desc: "Țiplare carte în folie de plastic, preț pe exemplar (TVA 11% inclus).", cat: "finisare", price: r4(1.27 * VAT_BOOK), qtyLabel: "Exemplare", qtyUnit: "buc." }),
      svcFmt({ id: "e-lacuire-sub", title: "Lăcuire (sub 30% suprafață)", desc: "Lăcuire pe sub 30% din suprafață (TVA 11% inclus).", cat: "finisare", prices: vat({ a4: 1.93, b5: 1.87, a5: 1.76, b6: 1.65, a6: 1.54 }, VAT_BOOK), qtyLabel: "Exemplare", qtyUnit: "buc." }),
      svcFmt({ id: "e-lacuire-peste", title: "Lăcuire (peste 30% suprafață)", desc: "Lăcuire pe peste 30% din suprafață (TVA 11% inclus).", cat: "finisare", prices: vat({ a4: 2.58, b5: 2.53, a5: 1.98, b6: 1.87, a6: 1.76 }, VAT_BOOK), qtyLabel: "Exemplare", qtyUnit: "buc." }),
      svcFmt({ id: "e-folio", title: "Folio copertă", desc: "Folio (folie metalizată) pe copertă (TVA 11% inclus).", cat: "finisare", prices: vat({ a4: 3.86, b5: 3.74, a5: 3.52, b6: 3.30, a6: 3.08 }, VAT_BOOK), qtyLabel: "Exemplare", qtyUnit: "buc." }),
      svcFmt({ id: "e-supracoperta", title: "Supracopertă", desc: "Supracopertă, preț pe exemplar (TVA 11% inclus).", cat: "finisare", prices: vat({ a4: 2.20, b5: 1.65, a5: 1.10, b6: 0.90, a6: 0.55 }, VAT_BOOK), qtyLabel: "Exemplare", qtyUnit: "buc." }),
      svcFmt({ id: "e-rotunjire", title: "Rotunjire cotor", desc: "Rotunjire cotor, preț pe exemplar (TVA 11% inclus).", cat: "finisare", prices: vat({ a4: 1.53, b5: 1.03, a5: 0.64, b6: 0.64, a6: 0.64 }, VAT_BOOK), qtyLabel: "Exemplare", qtyUnit: "buc." }),
      svcFmt({ id: "e-legare-cartonata", title: "Legare cartonată", desc: "Legare cartonată, preț pe exemplar (TVA 11% inclus).", cat: "legare", prices: vat({ a4: 6.80, b5: 5.80, a5: 5.00, b6: 4.20, a6: 3.30 }, VAT_BOOK), qtyLabel: "Exemplare", qtyUnit: "buc." }),
      svcFmt({ id: "e-legare-buretata", title: "Legare cartonată buretată", desc: "Legare cartonată buretată, preț pe exemplar (TVA 11% inclus).", cat: "legare", prices: vat({ a4: 8.50, b5: 7.00, a5: 6.00, b6: 5.50, a6: 4.00 }, VAT_BOOK), qtyLabel: "Exemplare", qtyUnit: "buc." }),
      svcFmt({ id: "e-legare-catifea", title: "Legare cartonată catifea", desc: "Legare cartonată cu catifea, preț pe exemplar (TVA 11% inclus).", cat: "legare", prices: vat({ a4: 22.50, b5: 17.50, a5: 15.00, b6: 14.50, a6: 14.00 }, VAT_BOOK), qtyLabel: "Exemplare", qtyUnit: "buc." }),
      svcFmt({ id: "e-legare-catifea-buretata", title: "Legare catifea buretată", desc: "Legare cartonată catifea buretată, preț pe exemplar (TVA 11% inclus).", cat: "legare", prices: vat({ a4: 24.90, b5: 19.00, a5: 16.00, b6: 15.50, a6: 15.00 }, VAT_BOOK), qtyLabel: "Exemplare", qtyUnit: "buc." }),
      svcFmt({ id: "e-coperta-fata", title: "Copertă - tipar față", desc: "Copertă carton volumetric, tipar față (TVA 11% inclus).", cat: "coperti", prices: vat({ a4: 1.00, b5: 0.75, a5: 0.50, b6: 0.40, a6: 0.25 }, VAT_BOOK), qtyLabel: "Exemplare", qtyUnit: "buc." }),
      svcFmt({ id: "e-coperta-fata-verso", title: "Copertă - tipar față-verso", desc: "Copertă carton volumetric, tipar față-verso (TVA 11% inclus).", cat: "coperti", prices: vat({ a4: 2.00, b5: 1.50, a5: 1.00, b6: 0.80, a6: 0.50 }, VAT_BOOK), qtyLabel: "Exemplare", qtyUnit: "buc." }),
    ],
  };
  return validate(doc);
}

// ── Schedules ────────────────────────────────────────────────────────────────
const wk = (open: string, close: string, sat: [string, string] | null = null, sun: [string, string] | null = null): WeeklySchedule => ({
  mon: { open, close }, tue: { open, close }, wed: { open, close }, thu: { open, close }, fri: { open, close },
  sat: sat ? { open: sat[0], close: sat[1] } : null,
  sun: sun ? { open: sun[0], close: sun[1] } : null,
});

// ── Shops ────────────────────────────────────────────────────────────────────
const copyDoc = buildCopy();
const persoDoc = buildPerso();
const edituraDoc = buildEditura();

export const shops = [
  {
    name: "PIM Copy - Smârdan",
    description: "Centrul principal PIM Copy: printare, copiere, scanare, legătorie și tipărituri. Strada Smârdan 76, Iași.",
    address: "Strada Smârdan 76, Iași",
    phones: ["0729 992 968", "0729 992 979"], email: "comenzismardan@pimcopy.ro",
    lat: 47.1579872, lng: 27.5937972, eta: 30,
    schedule: wk("06:00", "21:30"), doc: copyDoc,
  },
  {
    name: "PIM Copy - Tudor T18",
    description: "Centru PIM Copy în campusul Tudor Vladimirescu: printare, copiere, scanare și legătorie. Cămin T18.",
    address: "Bulevardul Tudor Vladimirescu, cămin T18, Iași",
    phones: ["0729 992 965", "0729 992 978"], email: "tudor@pimcopy.ro",
    lat: 47.1487573, lng: 27.6024016, eta: 30,
    schedule: wk("06:00", "21:30", ["09:00", "18:00"], ["09:00", "18:00"]), doc: copyDoc,
  },
  {
    name: "PIM Copy - Independenței",
    description: "Centru PIM Copy lângă UMF, Bulevardul Independenței 12: printare, copiere, scanare și legătorie.",
    address: "Bulevardul Independenței 12, Iași",
    phones: ["0729 992 967", "0729 992 976"], email: "comenziumf@pimcopy.ro",
    lat: 47.1679740, lng: 27.5807210, eta: 30,
    schedule: wk("06:00", "21:00", ["09:00", "16:30"]), doc: copyDoc,
  },
  {
    name: "PIM Personalizare",
    description: "Departamentul de personalizare PIM (Smârdan 76): tricouri, căni, gravare laser, insigne și decupare cutter plotter.",
    address: "Strada Smârdan 76, Iași",
    phones: ["0733 580 203"], email: "personalizare@pimcopy.ro",
    lat: 47.1579872, lng: 27.5937972, eta: 240,
    schedule: wk("09:00", "17:00"), doc: persoDoc,
  },
  {
    name: "PIM Editură & Tipografie",
    description: "Editura și tipografia PIM (Smârdan 76): tipar carte, legare, coperți și finisare. Prețuri conform listei oficiale, TVA 11% inclus.",
    address: "Strada Smârdan 76, Iași",
    phones: ["0730 086 676", "0732 430 407"], email: "tipografiaiasi@pimcopy.ro",
    lat: 47.1579872, lng: 27.5937972, eta: 4320,
    schedule: wk("06:00", "21:30"), doc: edituraDoc, website: "https://pimcopy.ro/editura",
  },
] as const;

// ── Emit JSON + SQL (only when run directly, not when imported by the runner) ──
if (import.meta.main) {
mkdirSync("seed/derived", { recursive: true });
writeFileSync("seed/derived/pim-copy.catalog.json", JSON.stringify(copyDoc, null, 2));
writeFileSync("seed/derived/pim-personalizare.catalog.json", JSON.stringify(persoDoc, null, 2));
writeFileSync("seed/derived/pim-editura.catalog.json", JSON.stringify(edituraDoc, null, 2));

const sqlStr = (s: string) => "'" + s.replace(/'/g, "''") + "'";
const sqlArr = (a: readonly string[]) => "ARRAY[" + a.map(sqlStr).join(", ") + "]::text[]";
const out: string[] = [];
out.push("-- PIM Copy seed. Generated by seed/build-pim.ts. Run via Supabase MCP (service role).");
out.push("begin;");
out.push(`-- Drop the old demo PIM Copy shop (shops->orders is RESTRICT, so clear its orders first).`);
out.push(`delete from public.orders where shop_id = ${sqlStr(OLD_PIM_SHOP_ID)};`);
out.push(`delete from public.shops where id = ${sqlStr(OLD_PIM_SHOP_ID)};`);
for (const s of shops) {
  const sid = randomUUID();
  const vid = randomUUID();
  const website = (s as { website?: string }).website ?? "https://pimcopy.ro";
  out.push("");
  out.push(`-- ${s.name}`);
  out.push(
    `insert into public.shops (id, name, description, address, phones, website_url, email, lat, lng, schedule, logo_path, default_eta_minutes, delivery_fee, is_active) values (` +
    `${sqlStr(sid)}, ${sqlStr(s.name)}, ${sqlStr(s.description)}, ${sqlStr(s.address)}, ${sqlArr(s.phones)}, ${sqlStr(website)}, ${sqlStr(s.email)}, ${s.lat}, ${s.lng}, ` +
    `$sched$${JSON.stringify(s.schedule)}$sched$::jsonb, ${sqlStr(LOGO)}, ${s.eta}, 0, true);`
  );
  out.push(
    `insert into public.catalog_versions (id, shop_id, version, status, label, document, published_at) values (` +
    `${sqlStr(vid)}, ${sqlStr(sid)}, 1, 'published', 'Catalog inițial', $doc$${JSON.stringify(s.doc)}$doc$::jsonb, now());`
  );
  out.push(`update public.shops set active_version_id = ${sqlStr(vid)} where id = ${sqlStr(sid)};`);
  out.push(`insert into public.shop_permissions (shop_id, profile_id, role) values (${sqlStr(sid)}, ${sqlStr(OWNER_PROFILE_ID)}, 'owner');`);
}
out.push("");
out.push("commit;");
writeFileSync("seed/pim-seed.sql", out.join("\n") + "\n");

const counts = (d: CatalogDocument) => `${d.items.length} items (${d.items.filter((i) => i.in_stock).length} active, ${d.items.filter((i) => !i.in_stock).length} hidden)`;
console.log("✓ Validated catalogs:");
console.log("  copy       :", counts(copyDoc));
console.log("  personalizare:", counts(persoDoc));
console.log("  editura    :", counts(edituraDoc));
console.log(`✓ Wrote seed/derived/*.json and seed/pim-seed.sql (${shops.length} shops).`);
}
