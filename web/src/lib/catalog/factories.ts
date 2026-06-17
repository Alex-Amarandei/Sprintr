import type { Category, Field, FieldType, FieldOption, Item, ItemKind } from "./schema";

/** Blank-but-valid builders for new catalog entities (with stable ids/keys). */

function uid(): string {
  return crypto.randomUUID();
}

export function newOption(index = 0): FieldOption {
  return { value: `optiune_${index + 1}`, label: `Opțiune ${index + 1}` };
}

/** First `${prefix}_N` not already in `existing` — for stable, unique, hidden machine keys. */
export function nextKey(prefix: string, existing: string[]): string {
  const used = new Set(existing);
  let n = existing.length + 1;
  while (used.has(`${prefix}_${n}`)) n++;
  return `${prefix}_${n}`;
}

export function newField(type: FieldType, index = 0): Field {
  const base = {
    key: `camp_${index + 1}`,
    label: `Câmp ${index + 1}`,
    required: false,
    help: null,
  };
  switch (type) {
    case "single_select":
      return { ...base, type, default: null, options: [newOption(0)] };
    case "multi_select":
      return {
        ...base,
        type,
        default: null,
        options: [newOption(0)],
        min_select: 0,
        max_select: null,
      };
    case "boolean":
      return { ...base, type, default: null };
    case "number":
      return {
        ...base,
        type,
        default: null,
        min: 1,
        max: null,
        step: 1,
        unit: null,
      };
    case "text":
      return { ...base, type, default: null };
  }
}

export function newItem(kind: ItemKind = "service", sortOrder = 0): Item {
  return {
    id: uid(),
    kind,
    title: kind === "service" ? "Serviciu nou" : "Produs nou",
    description: null,
    image_path: null,
    images: [],
    is_active: true,
    in_stock: true,
    sort_order: sortOrder,
    base_price: 0,
    min_quantity: 1,
    sku: null,
    unit: null,
    requires_upload: kind === "service",
    accepted_file_types: ["pdf"],
    stock_display: "none",
    inventory_item_id: null,
    category_id: null,
    fields: [],
  };
}

export function newCategory(name = "", sortOrder = 0): Category {
  return { id: crypto.randomUUID(), name, parent_id: null, sort_order: sortOrder };
}
