"use client";

import { Group, NumberInput, Select } from "@mantine/core";
import type { PriceRule } from "@/lib/catalog/schema";

type Mode = "none" | "additive" | "per_unit";

interface Props {
  value?: PriceRule;
  onChange: (value: PriceRule | undefined) => void;
  /** keys of `number` fields in the same item — valid targets for per_unit. */
  numberFieldKeys: string[];
  label?: string;
}

export function PriceRuleInput({
  value,
  onChange,
  numberFieldKeys,
  label = "Preț",
}: Props) {
  const mode: Mode = value?.mode ?? "none";
  const amount = value?.amount ?? 0;
  const per = value?.mode === "per_unit" ? value.per : numberFieldKeys[0] ?? "";

  const canPerUnit = numberFieldKeys.length > 0;

  function setMode(m: Mode) {
    if (m === "none") return onChange(undefined);
    if (m === "additive") return onChange({ mode: "additive", amount });
    onChange({ mode: "per_unit", amount, per: per || numberFieldKeys[0] || "" });
  }

  return (
    <Group align="flex-end" gap="sm" wrap="nowrap">
      <Select
        label={label}
        w={150}
        value={mode}
        onChange={(v) => setMode((v as Mode) ?? "none")}
        allowDeselect={false}
        data={[
          { value: "none", label: "Fără preț" },
          { value: "additive", label: "Sumă fixă (+)" },
          {
            value: "per_unit",
            label: "Per unitate",
            disabled: !canPerUnit,
          },
        ]}
      />
      {mode !== "none" && (
        <NumberInput
          label="Valoare (RON)"
          w={130}
          value={amount}
          min={0}
          decimalScale={2}
          step={0.5}
          onChange={(v) => {
            const n = typeof v === "number" ? v : Number(v) || 0;
            onChange(
              mode === "per_unit"
                ? { mode: "per_unit", amount: n, per }
                : { mode: "additive", amount: n }
            );
          }}
        />
      )}
      {mode === "per_unit" && (
        <Select
          label="× câmpul"
          w={150}
          value={per}
          allowDeselect={false}
          data={numberFieldKeys.map((k) => ({ value: k, label: k }))}
          onChange={(v) =>
            onChange({ mode: "per_unit", amount, per: v ?? per })
          }
        />
      )}
    </Group>
  );
}
