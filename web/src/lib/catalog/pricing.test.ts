/// <reference types="bun-types/test" />
import { describe, expect, test } from "bun:test";
import { itemSchema, type Item } from "./schema";
import { computeItemPrice, QUANTITY_KEY, type Answers } from "./pricing";
import { defaultAnswers } from "./answers";

/**
 * Guards the authoritative pricing formula (CLAUDE.md §7):
 *   quantity   = is_quantity field  OR  intrinsic __qty  (clamped to min_quantity, else 1)
 *   line_total = quantity × (base_price + Σ addons)
 * The place-order server reprice (api/place-order) MUST stay byte-equivalent to this — a >1 bani
 * divergence rejects a valid cart, so these tests are the contract for both sides.
 */

// Build a valid Item from a partial; itemSchema.parse fills all the non-pricing defaults.
function makeItem(partial: Record<string, unknown>): Item {
  return itemSchema.parse({
    id: "item-1",
    kind: "product",
    title: "Test item",
    base_price: 0,
    fields: [],
    ...partial,
  });
}

describe("computeItemPrice — base & quantity", () => {
  test("base price only, no fields → total = base, quantity 1", () => {
    const item = makeItem({ base_price: 12.5 });
    const r = computeItemPrice(item, {});
    expect(r.total).toBe(12.5);
    expect(r.quantity).toBe(1);
  });

  test("intrinsic __qty multiplies the line", () => {
    const item = makeItem({ base_price: 10 });
    const r = computeItemPrice(item, { [QUANTITY_KEY]: 3 });
    expect(r.quantity).toBe(3);
    expect(r.total).toBe(30);
  });

  test("min_quantity is the floor when nothing is answered (the 'total looked wrong' case)", () => {
    const item = makeItem({ base_price: 5, min_quantity: 100 });
    const r = computeItemPrice(item, {});
    expect(r.quantity).toBe(100);
    expect(r.total).toBe(500);
  });

  test("an under-min __qty is clamped up to min_quantity", () => {
    const item = makeItem({ base_price: 1, min_quantity: 100 });
    const r = computeItemPrice(item, { [QUANTITY_KEY]: 50 });
    expect(r.quantity).toBe(100);
    expect(r.total).toBe(100);
  });

  test("quantity 0 / NaN falls back to 1 (then min_quantity floor)", () => {
    const item = makeItem({ base_price: 7 });
    expect(computeItemPrice(item, { [QUANTITY_KEY]: 0 }).quantity).toBe(1);
    expect(computeItemPrice(item, { [QUANTITY_KEY]: "abc" }).quantity).toBe(1);
  });
});

describe("computeItemPrice — explicit is_quantity field wins over __qty", () => {
  const item = makeItem({
    base_price: 4,
    min_quantity: 1,
    fields: [{ type: "number", key: "buc", label: "Bucăți", min: 1, is_quantity: true }],
  });

  test("uses the is_quantity field, ignoring __qty", () => {
    const r = computeItemPrice(item, { buc: 5, [QUANTITY_KEY]: 99 });
    expect(r.quantity).toBe(5);
    expect(r.total).toBe(20);
  });
});

describe("computeItemPrice — addons", () => {
  test("additive single_select option adds a flat amount", () => {
    const item = makeItem({
      base_price: 10,
      fields: [
        {
          type: "single_select",
          key: "finisaj",
          label: "Finisaj",
          options: [
            { value: "mat", label: "Mat" },
            { value: "lucios", label: "Lucios", price: { mode: "additive", amount: 5 } },
          ],
        },
      ],
    });
    expect(computeItemPrice(item, { finisaj: "mat" }).total).toBe(10);
    const r = computeItemPrice(item, { finisaj: "lucios" });
    expect(r.total).toBe(15);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].amount).toBe(5);
  });

  test("boolean addon only counts when true", () => {
    const item = makeItem({
      base_price: 8,
      fields: [{ type: "boolean", key: "urgent", label: "Urgent", price: { mode: "additive", amount: 3 } }],
    });
    expect(computeItemPrice(item, { urgent: false }).total).toBe(8);
    expect(computeItemPrice(item, { urgent: true }).total).toBe(11);
  });

  test("multi_select sums every selected priced option", () => {
    const item = makeItem({
      base_price: 0,
      fields: [
        {
          type: "multi_select",
          key: "extra",
          label: "Extra",
          options: [
            { value: "a", label: "A", price: { mode: "additive", amount: 2 } },
            { value: "b", label: "B", price: { mode: "additive", amount: 3 } },
            { value: "c", label: "C" },
          ],
        },
      ],
    });
    expect(computeItemPrice(item, { extra: ["a", "b", "c"] }).total).toBe(5);
  });

  test("addons are multiplied by the quantity along with the base", () => {
    const item = makeItem({
      base_price: 10,
      fields: [{ type: "boolean", key: "gloss", label: "Gloss", price: { mode: "additive", amount: 2 } }],
    });
    // (10 + 2) × 3 = 36
    expect(computeItemPrice(item, { gloss: true, [QUANTITY_KEY]: 3 }).total).toBe(36);
  });
});

describe("computeItemPrice — per_unit pricing (parity-critical)", () => {
  const item = makeItem({
    base_price: 0,
    fields: [
      { type: "number", key: "pages", label: "Pagini", min: 0 },
      { type: "boolean", key: "laminate", label: "Laminare", price: { mode: "per_unit", amount: 2, per: "pages" } },
    ],
  });

  test("per_unit = amount × the referenced field's value", () => {
    // laminate per_unit 2 × pages 10 = 20
    expect(computeItemPrice(item, { pages: 10, laminate: true }).total).toBe(20);
  });

  test("per_unit with an unanswered `per` resolves to 0, NOT amount×1", () => {
    expect(computeItemPrice(item, { laminate: true }).total).toBe(0);
  });
});

describe("computeItemPrice — rounding & 'de la' unit price", () => {
  test("rounds half-up to 2 decimals", () => {
    const item = makeItem({ base_price: 0.1 });
    // 0.1 × 3 = 0.30000000000000004 → 0.3
    expect(computeItemPrice(item, { [QUANTITY_KEY]: 3 }).total).toBe(0.3);
  });

  test("per-unit teaser = total / quantity (the catalog 'de la' value)", () => {
    const item = makeItem({ base_price: 0.5, min_quantity: 100 });
    const r = computeItemPrice(item, defaultAnswers(item));
    expect(r.quantity).toBe(100);
    expect(r.total).toBe(50);
    expect(r.total / r.quantity).toBe(0.5); // shown as "de la 0,50 RON"
  });
});

describe("defaultAnswers — intrinsic quantity seeding", () => {
  test("seeds __qty to min_quantity when there is no is_quantity field", () => {
    const item = makeItem({ base_price: 1, min_quantity: 50 });
    expect(defaultAnswers(item)[QUANTITY_KEY]).toBe(50);
  });

  test("does NOT seed __qty when an explicit is_quantity field exists", () => {
    const item = makeItem({
      base_price: 1,
      fields: [{ type: "number", key: "buc", label: "Bucăți", min: 1, is_quantity: true }],
    });
    expect(defaultAnswers(item)[QUANTITY_KEY]).toBeUndefined();
  });

  test("default answers price out at exactly min_quantity × base", () => {
    const item = makeItem({ base_price: 2, min_quantity: 10 });
    const r = computeItemPrice(item, defaultAnswers(item) as Answers);
    expect(r.total).toBe(20);
  });
});
