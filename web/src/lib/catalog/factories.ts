import type { Field, FieldType, FieldOption, Item, ItemKind } from "./schema";

/** Blank-but-valid builders for new catalog entities (with stable ids/keys). */

function uid(): string {
  return crypto.randomUUID();
}

export function newOption(index = 0): FieldOption {
  return { value: `optiune_${index + 1}`, label: `Opțiune ${index + 1}` };
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
    is_active: true,
    sort_order: sortOrder,
    base_price: 0,
    requires_upload: kind === "service",
    stock_display: "none",
    inventory_item_id: null,
    fields: [],
  };
}
