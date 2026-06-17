"use client";

import { useState } from "react";
import {
  Badge,
  NumberInput,
  Popover,
  SegmentedControl,
  Select,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { Pencil } from "lucide-react";
import type { PriceRule } from "@/lib/catalog/schema";
import { formatPrice } from "@/lib/utils/format";

interface Props {
  value?: PriceRule;
  onChange: (value: PriceRule | undefined) => void;
  /** `number` fields in the same item — valid targets for per-unit pricing (shown by label). */
  numberFields: { key: string; label: string }[];
}

/**
 * Price as a readable, editable pill: "Gratuit" / "+5,00 RON" / "0,20 RON × pagini".
 * Click it to open a small editor (cost mode segmented control + amount [+ which quantity]).
 */
export function PriceRuleInput({ value, onChange, numberFields }: Props) {
  const [open, setOpen] = useState(false);

  const mode = value?.mode ?? "none";
  const amount = value?.amount ?? 0;
  const firstKey = numberFields[0]?.key ?? "";
  const per = value?.mode === "per_unit" ? value.per : firstKey;
  const canPer = numberFields.length > 0;
  const perLabel = numberFields.find((f) => f.key === per)?.label ?? "cantitate";

  // Human-readable pill text.
  let text: string;
  let muted = false;
  if (mode === "none" || !amount) {
    text = "Gratuit";
    muted = true;
  } else if (mode === "additive") {
    text = `+${formatPrice(amount)}`;
  } else {
    text = `${formatPrice(amount)} × ${perLabel}`;
  }

  function setAmount(v: number | string) {
    const n = typeof v === "number" ? v : Number(v) || 0;
    onChange(
      mode === "per_unit"
        ? { mode: "per_unit", amount: n, per }
        : { mode: "additive", amount: n }
    );
  }

  const seg = mode === "per_unit" ? "per" : mode === "additive" ? "fixed" : "none";
  const segData = [
    { value: "none", label: "Fără cost" },
    { value: "fixed", label: "Sumă fixă" },
    // Only offer per-unit when there's a Number field to multiply by (or one's already set).
    ...(canPer || mode === "per_unit"
      ? [{ value: "per", label: "Per cantitate", disabled: !canPer }]
      : []),
  ];

  function onSeg(v: string) {
    if (v === "none") onChange(undefined);
    else if (v === "fixed") onChange({ mode: "additive", amount });
    else onChange({ mode: "per_unit", amount, per: per || firstKey });
  }

  return (
    <Popover
      opened={open}
      onChange={setOpen}
      position="bottom-end"
      withArrow
      shadow="md"
      width={300}
      trapFocus
    >
      <Popover.Target>
        <UnstyledButton onClick={() => setOpen((o) => !o)} aria-label="Editează costul">
          <Badge
            variant="light"
            color={muted ? "mist" : "brand"}
            radius="sm"
            rightSection={<Pencil size={11} />}
            style={{ cursor: "pointer", textTransform: "none" }}
          >
            {text}
          </Badge>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <SegmentedControl fullWidth size="xs" value={seg} onChange={onSeg} data={segData} />
          {seg !== "none" && (
            <NumberInput
              size="xs"
              label="Valoare"
              value={amount}
              min={0}
              decimalScale={2}
              step={0.5}
              suffix=" RON"
              onChange={setAmount}
            />
          )}
          {seg === "per" &&
            (numberFields.length > 1 ? (
              <Select
                size="xs"
                label="Înmulțit cu"
                value={per}
                allowDeselect={false}
                data={numberFields.map((f) => ({ value: f.key, label: f.label || f.key }))}
                onChange={(v) => v && onChange({ mode: "per_unit", amount, per: v })}
              />
            ) : (
              <Text fz="xs" c="dimmed">
                Înmulțit cu: <b>{perLabel}</b>
              </Text>
            ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
