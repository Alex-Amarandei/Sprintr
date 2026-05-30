"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CheckIcon,
  Checkbox,
  ColorSwatch,
  Divider,
  FileInput,
  Group,
  Input,
  NumberInput,
  Paper,
  Radio,
  Stack,
  Switch,
  Text,
  Textarea,
  Title,
  Tooltip,
} from "@mantine/core";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import type { Field, Item, PriceRule } from "@/lib/catalog/schema";
import { computeItemPrice, type Answers } from "@/lib/catalog/pricing";
import { defaultAnswers, validateAnswers } from "@/lib/catalog/answers";
import { formatPrice } from "@/lib/utils/format";

function ruleHint(rule?: PriceRule): string | null {
  if (!rule) return null;
  if (rule.mode === "additive")
    return rule.amount ? `+${formatPrice(rule.amount)}` : null;
  return `+${formatPrice(rule.amount)}/${rule.per}`;
}

/** True if a select field's options carry color swatches → render them visually. */
function hasSwatches(field: Field): boolean {
  return (
    (field.type === "single_select" || field.type === "multi_select") &&
    field.options.some((o) => o.swatch)
  );
}

/** Visual color-swatch picker for single/multi select fields with swatches. */
function SwatchPicker({
  field,
  value,
  error,
  multi,
  onChange,
}: {
  field: Field & { type: "single_select" | "multi_select" };
  value: unknown;
  error?: string;
  multi: boolean;
  onChange: (value: unknown) => void;
}) {
  const selected = multi
    ? (Array.isArray(value) ? (value as string[]) : [])
    : value
      ? [value as string]
      : [];

  function pick(v: string, locked?: boolean) {
    if (multi) {
      if (locked) return; // locked options can't be toggled off
      onChange(
        selected.includes(v)
          ? selected.filter((x) => x !== v)
          : [...selected, v]
      );
    } else {
      onChange(v);
    }
  }

  return (
    <Input.Wrapper
      label={field.label}
      description={field.help ?? undefined}
      withAsterisk={field.required}
      error={error}
    >
      <Group gap="md" mt="xs">
        {field.options.map((o) => {
          const isSel = selected.includes(o.value);
          const hint = ruleHint(o.price);
          return (
            <Stack
              key={o.value}
              gap={4}
              align="center"
              style={{ cursor: "pointer", width: 64 }}
              onClick={() => pick(o.value, o.locked)}
            >
              <Tooltip label={o.label} withArrow>
                <ColorSwatch
                  color={o.swatch ?? "#ffffff"}
                  size={40}
                  withShadow
                  style={{
                    outline: isSel
                      ? "3px solid var(--mantine-color-brand-6)"
                      : "1px solid var(--mantine-color-gray-3)",
                    outlineOffset: 2,
                  }}
                >
                  {isSel && <CheckIcon style={{ width: 14, height: 14 }} />}
                </ColorSwatch>
              </Tooltip>
              <Text size="xs" ta="center" lh={1.1}>
                {o.label}
                {hint ? ` (${hint})` : ""}
              </Text>
            </Stack>
          );
        })}
      </Group>
    </Input.Wrapper>
  );
}

interface Props {
  item: Item;
  submitLabel?: string;
  onPlaceOrder?: (payload: {
    itemId: string;
    answers: Answers;
    total: number;
    fileName: string | null;
  }) => void;
}

export function ItemOrderForm({
  item,
  submitLabel = "Plasează comanda",
  onPlaceOrder,
}: Props) {
  const [answers, setAnswers] = useState<Answers>(() => defaultAnswers(item));
  const [file, setFile] = useState<File | null>(null);

  const set = (key: string, value: unknown) =>
    setAnswers((a) => ({ ...a, [key]: value }));

  const errors = useMemo(() => validateAnswers(item, answers), [item, answers]);
  const price = useMemo(() => computeItemPrice(item, answers), [item, answers]);

  const uploadMissing = item.requires_upload && !file;
  const canOrder = Object.keys(errors).length === 0 && !uploadMissing;

  function placeOrder() {
    const payload = {
      itemId: item.id,
      answers,
      total: price.total,
      fileName: file?.name ?? null,
    };
    if (onPlaceOrder) return onPlaceOrder(payload);
    console.log("[order preview]", payload);
    toast.success(
      `Comandă (preview): ${formatPrice(price.total)} — vezi consola pentru detalii`
    );
  }

  return (
    <Paper withBorder radius="lg" p="lg" shadow="xs">
      <Stack gap="md">
        <div>
          <Title order={3}>{item.title}</Title>
          {item.description && (
            <Text c="dimmed" size="sm" mt={4}>
              {item.description}
            </Text>
          )}
        </div>

        {item.requires_upload && (
          <FileInput
            label="Document PDF"
            description="Încarcă fișierul de tipărit"
            placeholder="Alege un fișier PDF"
            accept="application/pdf"
            leftSection={<FileUp size={16} />}
            value={file}
            onChange={setFile}
            error={uploadMissing ? "Fișierul este obligatoriu" : undefined}
            required
          />
        )}

        {item.fields.map((f) => {
          const err = errors[f.key];
          if (hasSwatches(f)) {
            return (
              <SwatchPicker
                key={f.key}
                field={f as Field & { type: "single_select" | "multi_select" }}
                value={answers[f.key]}
                error={err}
                multi={f.type === "multi_select"}
                onChange={(v) => set(f.key, v)}
              />
            );
          }

          switch (f.type) {
            case "single_select":
              return (
                <Radio.Group
                  key={f.key}
                  label={f.label}
                  description={f.help ?? undefined}
                  withAsterisk={f.required}
                  value={(answers[f.key] as string) ?? ""}
                  onChange={(v) => set(f.key, v)}
                  error={err}
                >
                  <Stack gap="xs" mt="xs">
                    {f.options.map((o) => {
                      const hint = ruleHint(o.price);
                      return (
                        <Radio
                          key={o.value}
                          value={o.value}
                          label={hint ? `${o.label}  (${hint})` : o.label}
                        />
                      );
                    })}
                  </Stack>
                </Radio.Group>
              );

            case "multi_select":
              return (
                <Checkbox.Group
                  key={f.key}
                  label={f.label}
                  description={f.help ?? undefined}
                  value={(answers[f.key] as string[]) ?? []}
                  onChange={(v) => set(f.key, v)}
                  error={err}
                >
                  <Stack gap="xs" mt="xs">
                    {f.options.map((o) => {
                      const hint = ruleHint(o.price);
                      return (
                        <Checkbox
                          key={o.value}
                          value={o.value}
                          disabled={o.locked}
                          label={hint ? `${o.label}  (${hint})` : o.label}
                        />
                      );
                    })}
                  </Stack>
                </Checkbox.Group>
              );

            case "boolean": {
              const hint = ruleHint(f.price);
              return (
                <Switch
                  key={f.key}
                  label={hint ? `${f.label}  (${hint})` : f.label}
                  description={f.help ?? undefined}
                  checked={Boolean(answers[f.key])}
                  onChange={(e) => set(f.key, e.currentTarget.checked)}
                />
              );
            }

            case "number":
              return (
                <NumberInput
                  key={f.key}
                  label={f.label}
                  description={f.help ?? undefined}
                  withAsterisk={f.required}
                  min={f.min}
                  max={f.max ?? undefined}
                  step={f.step}
                  suffix={f.unit ? ` ${f.unit}` : undefined}
                  value={(answers[f.key] as number) ?? f.min}
                  onChange={(v) => set(f.key, typeof v === "number" ? v : f.min)}
                  error={err}
                />
              );

            case "text":
              return (
                <Textarea
                  key={f.key}
                  label={f.label}
                  description={f.help ?? undefined}
                  withAsterisk={f.required}
                  autosize
                  minRows={2}
                  value={(answers[f.key] as string) ?? ""}
                  onChange={(e) => set(f.key, e.currentTarget.value)}
                  error={err}
                />
              );
          }
        })}

        <Divider />

        {/* Live price breakdown */}
        <Stack gap={4}>
          {price.basePrice > 0 && (
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Preț de bază
              </Text>
              <Text size="sm">{formatPrice(price.basePrice)}</Text>
            </Group>
          )}
          {price.lines.map((l, i) => (
            <Group key={i} justify="space-between">
              <Text size="sm" c="dimmed">
                {l.label}
              </Text>
              <Text size="sm">{formatPrice(l.amount)}</Text>
            </Group>
          ))}
          <Group justify="space-between" mt={4}>
            <Text fw={700}>Total</Text>
            <Text fw={700} fz="xl" c="brand.7">
              {formatPrice(price.total)}
            </Text>
          </Group>
        </Stack>

        {!canOrder && (
          <Alert color="yellow" variant="light" py="xs">
            Completează câmpurile obligatorii pentru a plasa comanda.
          </Alert>
        )}

        <Button onClick={placeOrder} disabled={!canOrder} size="md">
          {submitLabel} · {formatPrice(price.total)}
        </Button>
      </Stack>
    </Paper>
  );
}
