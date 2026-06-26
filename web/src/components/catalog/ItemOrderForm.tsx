"use client";

import { useMemo, useState } from "react";
import {
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
  Radio,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import type { Field, Item, PriceRule } from "@/lib/catalog/schema";
import { computeItemPrice, QUANTITY_KEY, type Answers } from "@/lib/catalog/pricing";
import { defaultAnswers, validateAnswers } from "@/lib/catalog/answers";
import { acceptAttr, acceptedLabel, fileAllowed } from "@/lib/catalog/fileTypes";
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
      <Group gap="md" mt="xs" align="flex-start">
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
              </Text>
              {hint && (
                <Text fz={10} fw={600} c="brand.7" ta="center" lh={1}>
                  {hint}
                </Text>
              )}
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
    files: File[];
  }) => void;
}

export function ItemOrderForm({
  item,
  submitLabel = "Plasează comanda",
  onPlaceOrder,
}: Props) {
  const [answers, setAnswers] = useState<Answers>(() => defaultAnswers(item));
  const [files, setFiles] = useState<File[]>([]);
  // Only surface validation errors after the first submit attempt.
  const [attempted, setAttempted] = useState(false);

  const set = (key: string, value: unknown) =>
    setAnswers((a) => ({ ...a, [key]: value }));

  const errors = useMemo(() => validateAnswers(item, answers), [item, answers]);
  const price = useMemo(() => computeItemPrice(item, answers), [item, answers]);

  const uploadMissing = item.requires_upload && files.length === 0;
  const canOrder = Object.keys(errors).length === 0 && !uploadMissing;

  function placeOrder() {
    if (!canOrder) {
      setAttempted(true);
      return;
    }
    const payload = {
      itemId: item.id,
      answers,
      total: price.total,
      files,
    };
    if (onPlaceOrder) return onPlaceOrder(payload);
    console.log("[order preview]", payload);
    toast.success(
      `Comandă (preview): ${formatPrice(price.total)} — vezi consola pentru detalii`
    );
  }

  return (
    <Box style={{ display: "flex", flexDirection: "column", maxHeight: "58vh" }}>
      <Box
        style={{
          overflowY: "auto",
          flex: 1,
          marginRight: "-8px",
          paddingRight: "8px",
        }}
      >
        <Stack gap="lg" pb="md">
        {item.requires_upload && (
          <FileInput
            multiple
            clearable
            label="Atașează fișiere"
            description={`Tipuri acceptate: ${acceptedLabel(item.accepted_file_types)}`}
            placeholder="Alege unul sau mai multe fișiere"
            accept={acceptAttr(item.accepted_file_types)}
            leftSection={<FileUp size={16} />}
            value={files}
            onChange={(picked) => {
              const arr = Array.isArray(picked) ? picked : [];
              const bad = arr.find((f) => !fileAllowed(f, item.accepted_file_types));
              if (bad) {
                toast.error(
                  `Tip de fișier neacceptat: ${bad.name}. Permise: ${acceptedLabel(item.accepted_file_types)}.`
                );
                return;
              }
              setFiles(arr);
            }}
            error={
              attempted && uploadMissing ? "Cel puțin un fișier este obligatoriu" : undefined
            }
            required
          />
        )}

        {/* Built-in quantity — shown unless the shop defined an explicit is_quantity field. */}
        {!item.fields.some((f) => f.type === "number" && f.is_quantity) && (
          <NumberInput
            label="Cantitate"
            description={
              item.min_quantity > 1
                ? `Comandă minimă ${item.min_quantity}${item.unit ? ` ${item.unit}` : ""}`
                : undefined
            }
            min={item.min_quantity}
            step={1}
            allowDecimal={false}
            clampBehavior="strict"
            suffix={item.unit ? ` ${item.unit}` : undefined}
            value={(answers[QUANTITY_KEY] as number) ?? item.min_quantity}
            onChange={(v) => set(QUANTITY_KEY, typeof v === "number" ? v : item.min_quantity)}
          />
        )}

        {item.fields.map((f) => {
          const err = attempted ? errors[f.key] : undefined;
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
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" mt="xs">
                    {f.options.map((o) => {
                      const hint = ruleHint(o.price);
                      return (
                        <Radio.Card key={o.value} value={o.value} radius="md" p="sm">
                          <Group wrap="nowrap" gap="sm" align="flex-start">
                            <Radio.Indicator />
                            <div>
                              <Text fw={600} fz="sm" lh={1.2}>
                                {o.label}
                              </Text>
                              {hint && (
                                <Text fz={11} fw={600} c="brand.7" mt={2}>
                                  {hint}
                                </Text>
                              )}
                            </div>
                          </Group>
                        </Radio.Card>
                      );
                    })}
                  </SimpleGrid>
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
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" mt="xs">
                    {f.options.map((o) => {
                      const hint = ruleHint(o.price);
                      return (
                        <Checkbox.Card
                          key={o.value}
                          value={o.value}
                          radius="md"
                          p="sm"
                          disabled={o.locked}
                        >
                          <Group wrap="nowrap" gap="sm" align="flex-start">
                            <Checkbox.Indicator />
                            <div>
                              <Text fw={600} fz="sm" lh={1.2}>
                                {o.label}
                              </Text>
                              {hint && (
                                <Text fz={11} fw={600} c="brand.7" mt={2}>
                                  {hint}
                                </Text>
                              )}
                            </div>
                          </Group>
                        </Checkbox.Card>
                      );
                    })}
                  </SimpleGrid>
                </Checkbox.Group>
              );

            case "boolean": {
              const hint = ruleHint(f.price);
              return (
                <Switch
                  key={f.key}
                  label={
                    <>
                      {f.label}
                      {hint && (
                        <Text span fz={11} fw={600} c="brand.7" ml={6}>
                          {hint}
                        </Text>
                      )}
                    </>
                  }
                  description={f.help ?? undefined}
                  checked={Boolean(answers[f.key])}
                  onChange={(e) => set(f.key, e.currentTarget.checked)}
                />
              );
            }

            case "number": {
              // The quantity field can't go below the item's min_quantity floor.
              const fmin = f.is_quantity ? Math.max(f.min, item.min_quantity) : f.min;
              return (
                <NumberInput
                  key={f.key}
                  label={f.label}
                  description={f.help ?? undefined}
                  withAsterisk={f.required}
                  min={fmin}
                  max={f.max ?? undefined}
                  step={f.step}
                  suffix={f.unit ? ` ${f.unit}` : undefined}
                  value={(answers[f.key] as number) ?? fmin}
                  onChange={(v) => set(f.key, typeof v === "number" ? v : fmin)}
                  error={err}
                />
              );
            }

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

        {/* Live price breakdown */}
        {(price.basePrice > 0 || price.lines.length > 0) && (
          <Box>
            <Divider mb="sm" />
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
              {price.quantity > 1 && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Cantitate
                  </Text>
                  <Text size="sm">
                    × {price.quantity}
                    {item.unit ? ` ${item.unit}` : ""}
                  </Text>
                </Group>
              )}
            </Stack>
          </Box>
        )}
        </Stack>
      </Box>

      {/* Footer — total + CTA, always visible below the scroll area */}
      <Box pt="md" style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
        {attempted && !canOrder && (
          <Text fz="xs" c="red.7" mb="xs">
            Completează câmpurile obligatorii pentru a continua.
          </Text>
        )}
        <Group justify="space-between" align="center" wrap="nowrap">
          <div>
            <Text tt="uppercase" fz={10} fw={700} c="dimmed">
              Total
            </Text>
            <Text fz={22} fw={800} c="var(--mantine-color-text)" lh={1}>
              {formatPrice(price.total)}
            </Text>
          </div>
          <Button onClick={placeOrder} size="md">
            {submitLabel}
          </Button>
        </Group>
      </Box>
    </Box>
  );
}
