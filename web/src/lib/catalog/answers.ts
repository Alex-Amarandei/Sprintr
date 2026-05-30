import type { Item } from "./schema";
import type { Answers } from "./pricing";

/** Initial answers for an item: applies field defaults + locked/default options (§4). */
export function defaultAnswers(item: Item): Answers {
  const a: Answers = {};
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
      case "number":
        a[f.key] = f.default ?? f.min;
        break;
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
        if (f.required && (v === null || v === "" || Number.isNaN(n)))
          errors[f.key] = "Completează un număr";
        else if (!Number.isNaN(n)) {
          if (n < f.min) errors[f.key] = `Minim ${f.min}`;
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
