// Convert a SprintR seed JSON (services[]/products[] with option groups) into a
// catalog `document` matching the builder schema (items[] with fields[]).
// Usage: bun run scripts/seed-to-document.mjs seed/printhaus.json > /tmp/printhaus.doc.json
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const slug = (s) =>
  s
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "x";

const UPLOAD_RE =
  /print|listar|multiplic|tipar|flyer|brosur|pliant|vizita|sticker|etichet|afis|banner|roll|tablou|canvas|tricou|cana|legator|brosare/i;

function optionFromChoice(c, i) {
  const out = {
    value: slug(c.value ?? c.label ?? `opt_${i}`),
    label: (c.value ?? c.label ?? `Opțiune ${i + 1}`).toString(),
    price: { mode: "additive", amount: Number(c.price_modifier) || 0 },
    default: i === 0,
    locked: false,
  };
  if (c.swatch) out.swatch = c.swatch;
  return out;
}

function fieldFromGroup(g, basePerUnit, isFirstNumber) {
  const key = slug(g.label);
  if (g.type === "number") {
    const f = {
      key,
      label: g.label,
      type: "number",
      required: g.is_required ?? true,
      help: null,
      default: 1,
      min: 1,
      max: null,
      step: 1,
      unit: g.label.match(/pagin|coli|cm|exemplar|buc|planș|set/i)
        ? g.label.toLowerCase()
        : null,
    };
    // First quantity field carries the service's per-unit base price.
    if (isFirstNumber && basePerUnit > 0)
      f.price = { mode: "per_unit", amount: basePerUnit, per: key };
    return f;
  }
  if (g.type === "boolean") {
    return {
      key,
      label: g.label,
      type: "boolean",
      required: false,
      help: null,
      default: null,
      price: { mode: "additive", amount: Number(g.price_modifier) || 0 },
    };
  }
  // radio | select -> single_select
  return {
    key,
    label: g.label,
    type: "single_select",
    required: g.is_required ?? true,
    help: null,
    default: null,
    options: (g.choices ?? []).map(optionFromChoice),
  };
}

function serviceToItem(s, i) {
  const groups = s.options ?? [];
  const hasNumber = groups.some((g) => g.type === "number");
  const basePerUnit = Number(s.base_price) || 0;
  // If there's a quantity field, the base price becomes its per-unit rate (item base = 0).
  const itemBase = hasNumber && basePerUnit > 0 ? 0 : basePerUnit;
  let seenNumber = false;
  const fields = groups.map((g) => {
    const first = g.type === "number" && !seenNumber;
    if (first) seenNumber = true;
    return fieldFromGroup(g, basePerUnit, first);
  });
  return {
    id: randomUUID(),
    kind: "service",
    title: s.name,
    description: s.description ?? null,
    image_path: null,
    is_active: true,
    sort_order: i,
    base_price: itemBase,
    requires_upload: UPLOAD_RE.test(s.name),
    stock_display: "none",
    inventory_item_id: null,
    fields,
  };
}

function productToItem(p, i, offset) {
  const fields = [];
  let base = Number(p.price) || 0;
  if (Array.isArray(p.price_tiers) && p.price_tiers.length) {
    base = 0;
    fields.push({
      key: "varianta",
      label: "Variantă",
      type: "single_select",
      required: true,
      help: null,
      default: null,
      options: p.price_tiers.map((t, j) => ({
        value: slug(t.format ?? t.label ?? `v${j}`),
        label: (t.format ?? t.label ?? `Variantă ${j + 1}`).toString(),
        price: { mode: "additive", amount: Number(t.price) || 0 },
        default: j === 0,
        locked: false,
      })),
    });
  } else {
    // flat product → quantity field that multiplies the unit price
    fields.push({
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
      price: { mode: "per_unit", amount: base, per: "cantitate" },
    });
    base = 0;
  }
  return {
    id: randomUUID(),
    kind: "product",
    title: p.name,
    description: p.description ?? null,
    image_path: null,
    is_active: true,
    sort_order: offset + i,
    base_price: base,
    requires_upload: false,
    stock_display: "none",
    inventory_item_id: null,
    fields,
  };
}

export function convert(seed) {
  const services = (seed.services ?? []).map(serviceToItem);
  const products = (seed.products ?? []).map((p, i) =>
    productToItem(p, i, services.length)
  );
  return { schema_version: 1, items: [...services, ...products] };
}

// CLI: print the converted document for a seed file.
if (import.meta.main) {
  const seed = JSON.parse(readFileSync(process.argv[2], "utf8"));
  process.stdout.write(JSON.stringify(convert(seed)));
}
