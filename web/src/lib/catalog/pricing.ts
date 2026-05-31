import type { Item, PriceRule } from "./schema";

/**
 * Client mirror of the authoritative pricing algorithm (CLAUDE.md §7).
 * place-order recomputes this server-side at order time — this is preview only, but it MUST
 * match (a mismatch beyond 1 bani rejects the order).
 *
 *   quantity   = answers[the is_quantity number field]  (or 1 if none)
 *   addons     = Σ field contributions (every NON-quantity field)
 *   line_total = quantity × (base_price + addons)
 *   resolve(additive)      = amount
 *   resolve(per_unit, per) = amount × answers[per]
 *   round half-up to 2 decimals at the end.
 */

export type Answers = Record<string, unknown>;

export interface PriceLine {
  label: string;
  amount: number;
}

function resolve(rule: PriceRule | undefined, answers: Answers): number {
  if (!rule) return 0;
  if (rule.mode === "additive") return rule.amount;
  const qty = Number(answers[rule.per]) || 0;
  return rule.amount * qty;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface PriceResult {
  total: number;
  basePrice: number;
  /** The is_quantity multiplier in effect (1 if the item has none). */
  quantity: number;
  lines: PriceLine[];
}

export function computeItemPrice(item: Item, answers: Answers): PriceResult {
  const lines: PriceLine[] = [];

  // The is_quantity number field multiplies the whole line; it is NOT an addon.
  const qField = item.fields.find((f) => f.type === "number" && f.is_quantity);
  const quantity = qField ? Number(answers[qField.key]) || 1 : 1;

  for (const f of item.fields) {
    if (f.type === "number" && f.is_quantity) continue;
    switch (f.type) {
      case "single_select": {
        const opt = f.options.find((o) => o.value === answers[f.key]);
        const amount = resolve(opt?.price, answers);
        if (opt && amount) lines.push({ label: `${f.label}: ${opt.label}`, amount });
        break;
      }
      case "multi_select": {
        const vals = Array.isArray(answers[f.key])
          ? (answers[f.key] as string[])
          : [];
        for (const v of vals) {
          const opt = f.options.find((o) => o.value === v);
          const amount = resolve(opt?.price, answers);
          if (opt && amount)
            lines.push({ label: `${f.label}: ${opt.label}`, amount });
        }
        break;
      }
      case "boolean": {
        if (answers[f.key] === true) {
          const amount = resolve(f.price, answers);
          if (amount) lines.push({ label: f.label, amount });
        }
        break;
      }
      case "number": {
        const amount = resolve(f.price, answers);
        if (amount) {
          const qty = Number(answers[f.key]) || 0;
          lines.push({
            label: `${f.label}${qty ? ` (${qty}${f.unit ? " " + f.unit : ""})` : ""}`,
            amount,
          });
        }
        break;
      }
      case "text":
        break;
    }
  }

  const sum = lines.reduce((s, l) => s + l.amount, 0);
  return {
    total: round2(quantity * (item.base_price + sum)),
    basePrice: item.base_price,
    quantity,
    lines,
  };
}
