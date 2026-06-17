"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  ColorInput,
  Divider,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import {
  ChevronUp,
  Hash,
  List,
  Pencil,
  Plus,
  ToggleLeft,
  Trash2,
  Type,
} from "lucide-react";
import {
  fieldTypes,
  TEXT_MAX,
  type Field,
  type FieldOption,
  type FieldType,
} from "@/lib/catalog/schema";
import { newField, newOption, nextKey } from "@/lib/catalog/factories";
import { HintLabel } from "@/components/ui/InfoHint";
import { PriceRuleInput } from "./PriceRuleInput";

type NumberField = { key: string; label: string };

const TYPE_LABELS: Record<FieldType, string> = {
  single_select: "Alegere (o variantă)",
  multi_select: "Alegere (mai multe)",
  boolean: "Da / Nu",
  number: "Cantitate",
  text: "Text liber",
};

const TYPE_ICONS: Record<FieldType, typeof List> = {
  single_select: List,
  multi_select: List,
  boolean: ToggleLeft,
  number: Hash,
  text: Type,
};

const TYPE_HINTS: Record<FieldType, string> = {
  single_select: "Clientul alege o singură variantă dintr-o listă (ex. tip de hârtie).",
  multi_select: "Clientul poate bifa mai multe variante (ex. finisaje suplimentare).",
  boolean: "O bifă simplă da/nu (ex. laminare).",
  number: "Un număr introdus de client (ex. pagini, bucăți) — poate înmulți prețul.",
  text: "Text liber scris de client (ex. mesaj personalizat).",
};

/** Small uppercase section label, tight to the content it heads. */
function SectionLabel({ children, mt }: { children: ReactNode; mt?: string | number }) {
  return (
    <Text fz="xs" fw={700} c="dimmed" tt="uppercase" mt={mt} mb={2} style={{ letterSpacing: 0.5 }}>
      {children}
    </Text>
  );
}

interface Props {
  field: Field;
  numberFields: NumberField[];
  onChange: (field: Field) => void;
  onRemove: () => void;
  /** Drag handle element (with dnd-kit listeners) rendered at the row start. */
  dragHandle?: ReactNode;
}

export function FieldEditor({
  field,
  numberFields,
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

  const TypeIcon = TYPE_ICONS[field.type];

  return (
    <Paper withBorder radius="md" bg="var(--mantine-color-body)">
      {/* Summary row — always visible, click to expand */}
      <Group justify="space-between" wrap="nowrap" gap="xs" p="sm">
        {dragHandle}

        <Group
          gap="xs"
          wrap="nowrap"
          style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
          onClick={() => setOpen((o) => !o)}
        >
          <ThemeIcon variant="subtle" color="gray" size="sm">
            <TypeIcon size={16} />
          </ThemeIcon>
          <Text fw={600} fz="sm" truncate>
            {field.label || "Întrebare nouă"}
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
          <ActionIcon variant="subtle" color="gray" onClick={() => setOpen((o) => !o)} aria-label="Editează întrebarea">
            {open ? <ChevronUp size={16} /> : <Pencil size={15} />}
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={onRemove} aria-label="Șterge întrebarea">
            <Trash2 size={16} />
          </ActionIcon>
        </Group>
      </Group>

      {open && (
        <>
          <Divider />
          <Stack gap="md" p="md">
            {/* ── Bază ─────────────────────────────────────────────────── */}
            <TextInput
              label="Întrebarea (vizibilă clientului)"
              placeholder="ex. Tip de legare"
              maxLength={TEXT_MAX}
              value={field.label}
              onChange={(e) => patch({ label: e.currentTarget.value })}
            />
            <Group align="flex-end" grow>
              <Select
                label={<HintLabel text="Tip" hint={TYPE_HINTS[field.type]} />}
                value={field.type}
                allowDeselect={false}
                data={fieldTypes.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
                onChange={(v) => v && changeType(v as FieldType)}
              />
              <TextInput
                label={
                  <HintLabel
                    text="Indiciu (opțional)"
                    hint="Un text scurt afișat sub câmp pentru a-l ajuta pe client."
                  />
                }
                placeholder="ex. Alege A4 pentru lucrări standard"
                maxLength={TEXT_MAX}
                value={field.help ?? ""}
                onChange={(e) => patch({ help: e.currentTarget.value || null })}
              />
            </Group>
            <Switch
              label={
                <HintLabel
                  text="Obligatoriu"
                  hint="Clientul trebuie să completeze acest câmp înainte de a comanda."
                />
              }
              checked={field.required}
              onChange={(e) => patch({ required: e.currentTarget.checked })}
            />

            {/* ── Options (selects) ─────────────────────────────────────── */}
            {hasOptions && (
              <>
                <OptionsEditor
                  options={field.options}
                  numberFields={numberFields}
                  multi={field.type === "multi_select"}
                  onChange={setOptions}
                />
                {field.type === "multi_select" && (
                  <Group align="flex-end" gap="sm">
                    <NumberInput
                      label="Minim selecții"
                      w={140}
                      min={0}
                      value={field.min_select}
                      onChange={(v) => patch({ min_select: typeof v === "number" ? v : 0 })}
                    />
                    <NumberInput
                      label={<HintLabel text="Maxim selecții" hint="Lasă gol pentru selecții nelimitate." />}
                      w={170}
                      min={1}
                      value={field.max_select ?? undefined}
                      onChange={(v) => patch({ max_select: typeof v === "number" ? v : null })}
                    />
                  </Group>
                )}
              </>
            )}

            {/* ── Number ("Cantitate") ──────────────────────────────────── */}
            {field.type === "number" && (
              <>
                <SectionLabel mt="xs">Reguli pentru cantitate</SectionLabel>
                <Group align="flex-end" gap="sm" wrap="wrap">
                  <NumberInput label="Min" w={90} value={field.min} onChange={(v) => patch({ min: typeof v === "number" ? v : 0 })} />
                  <NumberInput label={<HintLabel text="Max" hint="Lasă gol pentru fără limită." />} w={120} value={field.max ?? undefined} onChange={(v) => patch({ max: typeof v === "number" ? v : null })} />
                  <NumberInput label={<HintLabel text="Pas" hint="Cât crește valoarea la fiecare apăsare a săgeților." />} w={90} min={0} step={0.5} value={field.step} onChange={(v) => patch({ step: typeof v === "number" ? v : 1 })} />
                  <TextInput label={<HintLabel text="Unitate" hint="Afișată lângă număr (ex. pagini, bucăți)." />} w={130} maxLength={TEXT_MAX} placeholder="ex. pagini" value={field.unit ?? ""} onChange={(e) => patch({ unit: e.currentTarget.value || null })} />
                </Group>
                <Group gap="sm" align="center">
                  <Text fz="sm" fw={500}>Cost:</Text>
                  <PriceRuleInput value={field.price} numberFields={numberFields} onChange={(price) => patch({ price })} />
                </Group>
              </>
            )}

            {/* ── Boolean ───────────────────────────────────────────────── */}
            {field.type === "boolean" && (
              <Group gap="sm" align="center">
                <Text fz="sm" fw={500}>Cost când e bifat:</Text>
                <PriceRuleInput value={field.price} numberFields={numberFields} onChange={(price) => patch({ price })} />
              </Group>
            )}
          </Stack>
        </>
      )}
    </Paper>
  );
}

/* ── One option row: a clearly-editable label + a price pill + default + delete ───── */
function OptionRow({
  opt,
  multi,
  numberFields,
  onChange,
  onRemove,
}: {
  opt: FieldOption;
  multi: boolean;
  numberFields: NumberField[];
  onChange: (changes: Partial<FieldOption>) => void;
  onRemove: () => void;
}) {
  const [advanced, setAdvanced] = useState(!!opt.swatch || !!opt.locked);

  return (
    <Box>
      <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
        <TextInput
          size="sm"
          placeholder="ex. Spiră metalică"
          maxLength={TEXT_MAX}
          value={opt.label}
          onChange={(e) => onChange({ label: e.currentTarget.value })}
          style={{ flex: 1, minWidth: 140 }}
        />
        <Group gap="sm" wrap="nowrap" mih={36} align="center" style={{ flexShrink: 0 }}>
          <PriceRuleInput value={opt.price} numberFields={numberFields} onChange={(price) => onChange({ price })} />
          <Checkbox
            label={multi ? "Bifat" : "Implicit"}
            checked={opt.default ?? false}
            onChange={(e) => onChange({ default: e.currentTarget.checked })}
            styles={{ label: { paddingInlineStart: 6, fontSize: "var(--mantine-font-size-xs)" } }}
          />
          <ActionIcon variant="subtle" color="red" onClick={onRemove} aria-label="Șterge opțiunea">
            <Trash2 size={16} />
          </ActionIcon>
        </Group>
      </Group>

      <UnstyledButton onClick={() => setAdvanced((a) => !a)} mt={4}>
        <Group gap={4} wrap="nowrap">
          <ChevronUp
            size={12}
            style={{ transition: "transform 150ms", transform: advanced ? "none" : "rotate(180deg)", color: "var(--mantine-color-dimmed)" }}
          />
          <Text fz="xs" c="dimmed" fw={500}>
            Avansat
          </Text>
        </Group>
      </UnstyledButton>
      {advanced && (
        <Group align="flex-end" gap="sm" wrap="wrap" mt="xs">
          <ColorInput
            label={<HintLabel text="Culoare" hint="Afișează opțiunea ca un buline colorat (ex. alegeri de culoare)." />}
            w={170}
            format="hex"
            placeholder="#f5f5dc"
            value={opt.swatch ?? ""}
            onChange={(v) => onChange({ swatch: v || undefined })}
          />
          <Switch
            label={<HintLabel text="Inclus mereu" hint="Opțiunea e mereu selectată și clientul nu o poate scoate." />}
            checked={opt.locked ?? false}
            onChange={(e) => onChange({ locked: e.currentTarget.checked })}
          />
        </Group>
      )}
    </Box>
  );
}

function OptionsEditor({
  options,
  numberFields,
  multi,
  onChange,
}: {
  options: FieldOption[];
  numberFields: NumberField[];
  multi: boolean;
  onChange: (options: FieldOption[]) => void;
}) {
  const update = (i: number, changes: Partial<FieldOption>) => {
    let next = options.map((o, idx) => (idx === i ? { ...o, ...changes } : o));
    // Single-select: only one option can be the default — turning one on clears the rest.
    if (!multi && changes.default === true) {
      next = next.map((o, idx) => (idx === i ? o : { ...o, default: false }));
    }
    onChange(next);
  };
  const remove = (i: number) => onChange(options.filter((_, idx) => idx !== i));
  const add = () => {
    const value = nextKey("optiune", options.map((o) => o.value));
    onChange([...options, { ...newOption(options.length), value }]);
  };

  return (
    <Box>
      <SectionLabel mt="md">Opțiuni</SectionLabel>
      <Stack gap={0}>
        {options.map((opt, i) => (
          <Box key={i}>
            {i > 0 && <Divider />}
            <Box py="xs">
              <OptionRow
                opt={opt}
                multi={multi}
                numberFields={numberFields}
                onChange={(changes) => update(i, changes)}
                onRemove={() => remove(i)}
              />
            </Box>
          </Box>
        ))}
      </Stack>
      <Button variant="subtle" size="xs" leftSection={<Plus size={14} />} mt={4} onClick={add}>
        Adaugă opțiune
      </Button>
    </Box>
  );
}
