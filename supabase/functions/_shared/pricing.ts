// Mirror of web/src/lib/catalog/pricing.ts — keep in sync.
// Authoritative server-side price computation (§7 of catalog spec).

export type Answers = Record<string, unknown>;

interface PriceRule {
  mode: "additive" | "per_unit";
  amount: number;
  per?: string;
}

interface Option {
  value: string;
  price?: PriceRule;
}

interface Field {
  key: string;
  type: string;
  is_quantity?: boolean;
  price?: PriceRule;
  options?: Option[];
}

interface Item {
  base_price: number;
  fields: Field[];
}

function resolvePrice(rule: PriceRule | undefined, answers: Answers): number {
  if (!rule) return 0;
  if (rule.mode === "additive") return rule.amount;
  if (rule.mode === "per_unit" && rule.per) {
    const units = Number(answers[rule.per] ?? 1);
    return rule.amount * units;
  }
  return 0;
}

function roundHalfUp(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeItemPrice(
  item: Item,
  answers: Answers
): { total: number; breakdown: Record<string, number> } {
  const quantityField = item.fields.find((f) => f.is_quantity);
  const quantity = quantityField ? Number(answers[quantityField.key] ?? 1) : 1;

  let addons = 0;
  const breakdown: Record<string, number> = {};

  for (const field of item.fields) {
    if (field.is_quantity) continue;
    const val = answers[field.key];
    let contribution = 0;

    if (field.type === "single_select") {
      const chosen = field.options?.find((o) => o.value === val);
      contribution = resolvePrice(chosen?.price, answers);
    } else if (field.type === "multi_select") {
      const chosen = Array.isArray(val) ? (val as string[]) : [];
      for (const v of chosen) {
        const opt = field.options?.find((o) => o.value === v);
        contribution += resolvePrice(opt?.price, answers);
      }
    } else if (field.type === "boolean") {
      contribution = val === true ? resolvePrice(field.price, answers) : 0;
    } else if (field.type === "number") {
      contribution = resolvePrice(field.price, answers);
    }

    if (contribution !== 0) breakdown[field.key] = contribution;
    addons += contribution;
  }

  const total = roundHalfUp(quantity * (item.base_price + addons));
  return { total, breakdown };
}
