import type { Item } from "./schema";
import { QUANTITY_KEY, type Answers } from "./pricing";

/** Initial answers for an item: applies field defaults + locked/default options (§4). */
export function defaultAnswers(item: Item): Answers {
  const a: Answers = {};
  // Intrinsic quantity: unless the shop defined an explicit is_quantity field, every item carries a
  // built-in quantity seeded to its min_quantity floor.
  if (!item.fields.some((f) => f.type === "number" && f.is_quantity)) {
    a[QUANTITY_KEY] = Math.max(item.min_quantity, 1);
  }
  for (const f of item.fields) {
    switch (f.type) {
      case "single_select": {
        const def =
          f.default ??
          f.options.find((o) => o.default || o.locked)?.value ??
          null;
        a[f.key] = def;
        break;
      }
      case "multi_select": {
        const preset = f.options
          .filter((o) => o.default || o.locked)
          .map((o) => o.value);
        a[f.key] = f.default ?? preset;
        break;
      }
      case "boolean":
        a[f.key] = f.default ?? false;
        break;
      case "number": {
        // The quantity field can't default below the item's min_quantity floor.
        const floor = f.is_quantity ? Math.max(f.min, item.min_quantity) : f.min;
        a[f.key] = Math.max(f.default ?? floor, floor);
        break;
      }
      case "text":
        a[f.key] = f.default ?? "";
        break;
    }
  }
  return a;
}

/** Validate answers against the item schema (CLAUDE.md §8). Returns field-keyed errors. */
export function validateAnswers(
  item: Item,
  answers: Answers
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const f of item.fields) {
    const v = answers[f.key];
    switch (f.type) {
      case "single_select": {
        if (f.required && !v) errors[f.key] = "Selectează o opțiune";
        else if (v && !f.options.some((o) => o.value === v))
          errors[f.key] = "Opțiune invalidă";
        break;
      }
      case "multi_select": {
        const arr = Array.isArray(v) ? (v as string[]) : [];
        if (arr.length < f.min_select)
          errors[f.key] = `Alege cel puțin ${f.min_select}`;
        else if (f.max_select != null && arr.length > f.max_select)
          errors[f.key] = `Alege cel mult ${f.max_select}`;
        // all locked options must be present
        const missingLocked = f.options.some(
          (o) => o.locked && !arr.includes(o.value)
        );
        if (missingLocked) errors[f.key] = "Lipsește o opțiune obligatorie";
        break;
      }
      case "number": {
        const n = Number(v);
        // The quantity field enforces the item's min_quantity floor.
        const min = f.is_quantity ? Math.max(f.min, item.min_quantity) : f.min;
        if (f.required && (v === null || v === "" || Number.isNaN(n)))
          errors[f.key] = "Completează un număr";
        else if (!Number.isNaN(n)) {
          if (n < min) errors[f.key] = `Minim ${min}`;
          else if (f.max != null && n > f.max) errors[f.key] = `Maxim ${f.max}`;
        }
        break;
      }
      case "text":
        if (f.required && !String(v ?? "").trim())
          errors[f.key] = "Completează acest câmp";
        break;
      case "boolean":
        break;
    }
  }

  return errors;
}
