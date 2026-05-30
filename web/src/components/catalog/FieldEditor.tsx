"use client";

import {
  ActionIcon,
  Box,
  Button,
  ColorInput,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  TextInput,
} from "@mantine/core";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import {
  fieldTypes,
  type Field,
  type FieldOption,
  type FieldType,
} from "@/lib/catalog/schema";
import { newField, newOption } from "@/lib/catalog/factories";
import { PriceRuleInput } from "./PriceRuleInput";

const TYPE_LABELS: Record<FieldType, string> = {
  single_select: "Selecție unică",
  multi_select: "Selecție multiplă",
  boolean: "Da / Nu",
  number: "Număr",
  text: "Text liber",
};

interface Props {
  field: Field;
  numberFieldKeys: string[];
  onChange: (field: Field) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function FieldEditor({
  field,
  numberFieldKeys,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: Props) {
  // patch helper keeps the discriminated union happy
  const patch = (changes: Partial<Field>) =>
    onChange({ ...field, ...changes } as Field);

  function changeType(type: FieldType) {
    if (type === field.type) return;
    const fresh = newField(type);
    onChange({
      ...fresh,
      key: field.key,
      label: field.label,
      required: field.required,
      help: field.help,
    } as Field);
  }

  const hasOptions =
    field.type === "single_select" || field.type === "multi_select";

  function setOptions(options: FieldOption[]) {
    onChange({ ...field, options } as Field);
  }

  return (
    <Paper withBorder radius="md" p="md" bg="gray.0">
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={onMoveUp}
              disabled={!onMoveUp}
              aria-label="Mută în sus"
            >
              <ChevronUp size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={onMoveDown}
              disabled={!onMoveDown}
              aria-label="Mută în jos"
            >
              <ChevronDown size={16} />
            </ActionIcon>
          </Group>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={onRemove}
            aria-label="Șterge câmpul"
          >
            <Trash2 size={16} />
          </ActionIcon>
        </Group>

        <Group grow align="flex-start">
          <TextInput
            label="Etichetă (vizibilă clientului)"
            value={field.label}
            onChange={(e) => patch({ label: e.currentTarget.value })}
          />
          <TextInput
            label="Cheie (machine)"
            value={field.key}
            description="doar a-z, 0-9, _"
            onChange={(e) =>
              patch({
                key: e.currentTarget.value
                  .toLowerCase()
                  .replace(/[^a-z0-9_]/g, "_"),
              })
            }
          />
          <Select
            label="Tip"
            value={field.type}
            allowDeselect={false}
            data={fieldTypes.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
            onChange={(v) => v && changeType(v as FieldType)}
          />
        </Group>

        <Group>
          <Switch
            label="Obligatoriu"
            checked={field.required}
            onChange={(e) => patch({ required: e.currentTarget.checked })}
          />
        </Group>

        {/* Type-specific controls */}
        {hasOptions && (
          <OptionsEditor
            options={field.options}
            numberFieldKeys={numberFieldKeys}
            multi={field.type === "multi_select"}
            onChange={setOptions}
          />
        )}

        {field.type === "multi_select" && (
          <Group>
            <NumberInput
              label="Minim selecții"
              w={140}
              min={0}
              value={field.min_select}
              onChange={(v) =>
                patch({ min_select: typeof v === "number" ? v : 0 })
              }
            />
            <NumberInput
              label="Maxim selecții (gol = nelimitat)"
              w={200}
              min={1}
              value={field.max_select ?? undefined}
              onChange={(v) =>
                patch({ max_select: typeof v === "number" ? v : null })
              }
            />
          </Group>
        )}

        {field.type === "number" && (
          <Group align="flex-end" wrap="wrap">
            <NumberInput
              label="Min"
              w={90}
              value={field.min}
              onChange={(v) => patch({ min: typeof v === "number" ? v : 0 })}
            />
            <NumberInput
              label="Max (gol = ∞)"
              w={120}
              value={field.max ?? undefined}
              onChange={(v) =>
                patch({ max: typeof v === "number" ? v : null })
              }
            />
            <NumberInput
              label="Pas"
              w={90}
              min={0}
              step={0.5}
              value={field.step}
              onChange={(v) => patch({ step: typeof v === "number" ? v : 1 })}
            />
            <TextInput
              label="Unitate"
              w={120}
              placeholder="ex. pagini"
              value={field.unit ?? ""}
              onChange={(e) =>
                patch({ unit: e.currentTarget.value || null })
              }
            />
            <PriceRuleInput
              label="Preț câmp"
              value={field.price}
              numberFieldKeys={numberFieldKeys}
              onChange={(price) => patch({ price })}
            />
          </Group>
        )}

        {field.type === "boolean" && (
          <PriceRuleInput
            label="Preț când e bifat"
            value={field.price}
            numberFieldKeys={numberFieldKeys}
            onChange={(price) => patch({ price })}
          />
        )}
      </Stack>
    </Paper>
  );
}

function OptionsEditor({
  options,
  numberFieldKeys,
  multi,
  onChange,
}: {
  options: FieldOption[];
  numberFieldKeys: string[];
  multi: boolean;
  onChange: (options: FieldOption[]) => void;
}) {
  const update = (i: number, changes: Partial<FieldOption>) =>
    onChange(options.map((o, idx) => (idx === i ? { ...o, ...changes } : o)));
  const remove = (i: number) => onChange(options.filter((_, idx) => idx !== i));
  const add = () => onChange([...options, newOption(options.length)]);

  return (
    <Stack gap="xs">
      {options.map((opt, i) => (
        <Box
          key={i}
          style={{
            borderLeft: "3px solid var(--mantine-color-brand-3)",
            paddingLeft: 12,
          }}
        >
          <Group align="flex-end" gap="sm" wrap="wrap">
            <TextInput
              label="Etichetă"
              w={160}
              value={opt.label}
              onChange={(e) => update(i, { label: e.currentTarget.value })}
            />
            <TextInput
              label="Valoare"
              w={140}
              value={opt.value}
              onChange={(e) =>
                update(i, {
                  value: e.currentTarget.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, "_"),
                })
              }
            />
            <ColorInput
              label="Culoare (opțional)"
              w={150}
              format="hex"
              placeholder="ex. #f5f5dc"
              value={opt.swatch ?? ""}
              onChange={(v) => update(i, { swatch: v || undefined })}
            />
            <PriceRuleInput
              value={opt.price}
              numberFieldKeys={numberFieldKeys}
              onChange={(price) => update(i, { price })}
            />
            <Switch
              label={multi ? "Bifat implicit" : "Implicit"}
              checked={opt.default ?? false}
              onChange={(e) => update(i, { default: e.currentTarget.checked })}
            />
            <Switch
              label="Blocat"
              checked={opt.locked ?? false}
              onChange={(e) => update(i, { locked: e.currentTarget.checked })}
            />
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => remove(i)}
              aria-label="Șterge opțiunea"
            >
              <Trash2 size={16} />
            </ActionIcon>
          </Group>
        </Box>
      ))}
      <Button
        variant="light"
        size="xs"
        leftSection={<Plus size={14} />}
        onClick={add}
        w="fit-content"
      >
        Adaugă opțiune
      </Button>
    </Stack>
  );
}
