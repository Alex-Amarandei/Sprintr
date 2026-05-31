import { z } from "zod";

/**
 * Zod schema mirroring the "Catalog & product builder" spec in CLAUDE.md.
 * Single source of truth for the builder, the (future) customer renderer, and the
 * client-side mirror of the Edge Function's validation/pricing. Keep in sync with the spec.
 */

/** Max length for any user-entered text field (titles, labels, descriptions…). */
export const TEXT_MAX = 256;
/** Max images per item (× MAX_IMAGE_MB in images.ts ≈ storage budget per item). */
export const MAX_IMAGES = 6;

// ---- PriceRule (§5) -------------------------------------------------------
export const priceRuleSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("additive"), amount: z.number() }),
  z.object({
    mode: z.literal("per_unit"),
    amount: z.number(),
    // `per` = key of a number field in the same item.
    per: z.string().min(1),
  }),
]);
export type PriceRule = z.infer<typeof priceRuleSchema>;

// ---- Field options (single_select / multi_select) -------------------------
export const fieldOptionSchema = z.object({
  value: z.string().min(1).max(TEXT_MAX),
  label: z.string().min(1).max(TEXT_MAX),
  price: priceRuleSchema.optional(),
  // Optional hex color (e.g. "#f5f5dc") → render this option as a visible swatch
  // instead of plain text. Display-only; never affects pricing/validation.
  swatch: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "cod hex invalid")
    .optional(),
  default: z.boolean().optional(),
  locked: z.boolean().optional(),
});
export type FieldOption = z.infer<typeof fieldOptionSchema>;

// ---- Field types (§4) -----------------------------------------------------
export const fieldTypes = [
  "single_select",
  "multi_select",
  "boolean",
  "number",
  "text",
] as const;
export type FieldType = (typeof fieldTypes)[number];

const fieldBase = {
  key: z
    .string()
    .min(1)
    .max(TEXT_MAX)
    .regex(/^[a-z0-9_]+$/, "doar litere mici, cifre și _"),
  label: z.string().min(1).max(TEXT_MAX),
  required: z.boolean().default(false),
  help: z.string().max(TEXT_MAX).nullable().default(null),
};

export const fieldSchema = z.discriminatedUnion("type", [
  z.object({
    ...fieldBase,
    type: z.literal("single_select"),
    default: z.string().nullable().default(null),
    options: z.array(fieldOptionSchema).default([]),
  }),
  z.object({
    ...fieldBase,
    type: z.literal("multi_select"),
    default: z.array(z.string()).nullable().default(null),
    options: z.array(fieldOptionSchema).default([]),
    min_select: z.number().int().min(0).default(0),
    max_select: z.number().int().min(1).nullable().default(null),
  }),
  z.object({
    ...fieldBase,
    type: z.literal("boolean"),
    default: z.boolean().nullable().default(null),
    price: priceRuleSchema.optional(),
  }),
  z.object({
    ...fieldBase,
    type: z.literal("number"),
    default: z.number().nullable().default(null),
    min: z.number().default(1),
    max: z.number().nullable().default(null),
    step: z.number().positive().default(1),
    unit: z.string().max(TEXT_MAX).nullable().default(null),
    price: priceRuleSchema.optional(),
    // At most one per item: this field's value multiplies the whole line (CLAUDE.md §7).
    is_quantity: z.boolean().optional(),
  }),
  z.object({
    ...fieldBase,
    type: z.literal("text"),
    default: z.string().nullable().default(null),
  }),
]);
export type Field = z.infer<typeof fieldSchema>;

// ---- Item (§3) ------------------------------------------------------------
export const itemKinds = ["service", "product"] as const;
export type ItemKind = (typeof itemKinds)[number];

export const stockDisplayValues = ["none", "in_out", "exact"] as const;

// Supported uploadable file types (shop picks a subset per item that needs a file).
export const fileTypeValues = ["pdf", "word", "excel", "image", "csv"] as const;
export type FileTypeKey = (typeof fileTypeValues)[number];

export const itemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(itemKinds),
  title: z.string().min(1).max(TEXT_MAX),
  description: z.string().max(TEXT_MAX).nullable().default(null),
  image_path: z.string().nullable().default(null), // legacy single image — superseded by `images`
  // Ordered list of image storage paths; `images[0]` is the main/displayed image
  // (shown to customers and in the builder). Additive + backward-compatible: old
  // documents without it parse to []. TODO(BE): mirror in the server doc validator.
  images: z.array(z.string()).max(MAX_IMAGES).default([]),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  base_price: z.number().min(0).default(0),
  requires_upload: z.boolean().default(false),
  // Which file types the customer may upload when `requires_upload`. Defaults to PDF
  // (backward-compatible with documents created before this field existed).
  accepted_file_types: z.array(z.enum(fileTypeValues)).default(["pdf"]),
  stock_display: z.enum(stockDisplayValues).default("none"),
  inventory_item_id: z.string().nullable().default(null), // Phase 2
  // Optional link to a category from document.categories (§2). Backward-compatible.
  category_id: z.string().nullable().default(null),
  fields: z.array(fieldSchema).default([]),
});
export type Item = z.infer<typeof itemSchema>;

// ---- Categories (§2) — per-shop, flat list (parent_id reserved for nesting) ----
export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(TEXT_MAX),
  parent_id: z.string().nullable().default(null),
  sort_order: z.number().int().default(0),
});
export type Category = z.infer<typeof categorySchema>;

// ---- Document (§2) --------------------------------------------------------
export const catalogDocumentSchema = z.object({
  schema_version: z.literal(1),
  categories: z.array(categorySchema).default([]),
  items: z.array(itemSchema).default([]),
});
export type CatalogDocument = z.infer<typeof catalogDocumentSchema>;

export const emptyDocument: CatalogDocument = {
  schema_version: 1,
  categories: [],
  items: [],
};

/** Parse an unknown jsonb document defensively; falls back to empty on failure. */
export function parseDocument(input: unknown): CatalogDocument {
  const result = catalogDocumentSchema.safeParse(input);
  return result.success ? result.data : emptyDocument;
}
