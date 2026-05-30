"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  ColorInput,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
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
  /** Drag handle element (with dnd-kit listeners) rendered at the row start. */
  dragHandle?: ReactNode;
}

export function FieldEditor({
  field,
  numberFieldKeys,
  onChange,
  onRemove,
  dragHandle,
}: Props) {
  // New fields (no label yet) start open; existing ones start collapsed.
  const [open, setOpen] = useState(!field.label);

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

  const setOptions = (options: FieldOption[]) =>
    onChange({ ...field, options } as Field);

  return (
    <Paper withBorder radius="md" bg="gray.0">
      {/* Summary row — always visible, click to expand */}
      <Group justify="space-between" wrap="nowrap" gap="xs" p="sm">
        {dragHandle}

        <Group
          gap="xs"
          wrap="nowrap"
          style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
          onClick={() => setOpen((o) => !o)}
        >
          <Text fw={600} fz="sm" truncate>
            {field.label || "Câmp nou"}
          </Text>
          <Badge size="sm" variant="light" color="mist">
            {TYPE_LABELS[field.type]}
          </Badge>
          {field.required && (
            <Badge size="sm" variant="light" color="brand">
              Obligatoriu
            </Badge>
          )}
        </Group>

        <Group gap={2} wrap="nowrap">
          <ActionIcon variant="subtle" color="gray" onClick={() => setOpen((o) => !o)} aria-label="Editează câmpul">
            {open ? <ChevronUp size={16} /> : <Pencil size={15} />}
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={onRemove} aria-label="Șterge câmpul">
            <Trash2 size={16} />
          </ActionIcon>
        </Group>
      </Group>

      {open && (
        <Stack gap="md" px="sm" pb="md">
          <Group grow align="flex-end">
            <TextInput
              label="Etichetă (vizibilă clientului)"
              value={field.label}
              onChange={(e) => patch({ label: e.currentTarget.value })}
            />
            <TextInput
              label="Cheie (machine)"
              description="doar a-z, 0-9, _"
              value={field.key}
              onChange={(e) =>
                patch({
                  key: e.currentTarget.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
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

          <Switch
            label="Obligatoriu"
            checked={field.required}
            onChange={(e) => patch({ required: e.currentTarget.checked })}
          />

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
            <Group align="flex-end">
              <NumberInput
                label="Minim selecții"
                w={140}
                min={0}
                value={field.min_select}
                onChange={(v) => patch({ min_select: typeof v === "number" ? v : 0 })}
              />
              <NumberInput
                label="Maxim (gol = nelimitat)"
                w={200}
                min={1}
                value={field.max_select ?? undefined}
                onChange={(v) => patch({ max_select: typeof v === "number" ? v : null })}
              />
            </Group>
          )}

          {field.type === "number" && (
            <Group align="flex-end" wrap="wrap">
              <NumberInput label="Min" w={90} value={field.min} onChange={(v) => patch({ min: typeof v === "number" ? v : 0 })} />
              <NumberInput label="Max (gol = ∞)" w={120} value={field.max ?? undefined} onChange={(v) => patch({ max: typeof v === "number" ? v : null })} />
              <NumberInput label="Pas" w={90} min={0} step={0.5} value={field.step} onChange={(v) => patch({ step: typeof v === "number" ? v : 1 })} />
              <TextInput label="Unitate" w={120} placeholder="ex. pagini" value={field.unit ?? ""} onChange={(e) => patch({ unit: e.currentTarget.value || null })} />
              <PriceRuleInput label="Preț câmp" value={field.price} numberFieldKeys={numberFieldKeys} onChange={(price) => patch({ price })} />
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
      )}
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
    <Box>
      <Text fz="xs" fw={600} c="dimmed" tt="uppercase" mb="xs" style={{ letterSpacing: 0.5 }}>
        Opțiuni
      </Text>
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
              <TextInput label="Etichetă" w={160} value={opt.label} onChange={(e) => update(i, { label: e.currentTarget.value })} />
              <TextInput
                label="Valoare"
                w={130}
                value={opt.value}
                onChange={(e) => update(i, { value: e.currentTarget.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
              />
              <ColorInput label="Culoare (opțional)" w={150} format="hex" placeholder="#f5f5dc" value={opt.swatch ?? ""} onChange={(v) => update(i, { swatch: v || undefined })} />
              <PriceRuleInput value={opt.price} numberFieldKeys={numberFieldKeys} onChange={(price) => update(i, { price })} />
              <Switch label={multi ? "Bifat implicit" : "Implicit"} checked={opt.default ?? false} onChange={(e) => update(i, { default: e.currentTarget.checked })} />
              <Switch label="Blocat" checked={opt.locked ?? false} onChange={(e) => update(i, { locked: e.currentTarget.checked })} />
              <ActionIcon variant="subtle" color="red" onClick={() => remove(i)} aria-label="Șterge opțiunea">
                <Trash2 size={16} />
              </ActionIcon>
            </Group>
          </Box>
        ))}
        <Button variant="light" size="xs" leftSection={<Plus size={14} />} onClick={add} w="fit-content">
          Adaugă opțiune
        </Button>
      </Stack>
    </Box>
  );
}
