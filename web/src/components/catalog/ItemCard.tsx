"use client";

import {
  ActionIcon,
  Badge,
  Button,
  Divider,
  Group,
  Menu,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import {
  fieldTypes,
  itemKinds,
  type Field,
  type FieldType,
  type Item,
  type ItemKind,
} from "@/lib/catalog/schema";
import { newField } from "@/lib/catalog/factories";
import { FieldEditor } from "./FieldEditor";

const TYPE_LABELS: Record<FieldType, string> = {
  single_select: "Selecție unică",
  multi_select: "Selecție multiplă",
  boolean: "Da / Nu",
  number: "Număr",
  text: "Text liber",
};

function moveInArray<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

interface Props {
  item: Item;
  onChange: (item: Item) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function ItemCard({
  item,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: Props) {
  const patch = (changes: Partial<Item>) => onChange({ ...item, ...changes });

  const numberFieldKeys = item.fields
    .filter((f) => f.type === "number")
    .map((f) => f.key);

  function setFields(fields: Field[]) {
    onChange({ ...item, fields });
  }
  function addField(type: FieldType) {
    setFields([...item.fields, newField(type, item.fields.length)]);
  }
  function updateField(i: number, field: Field) {
    setFields(item.fields.map((f, idx) => (idx === i ? field : f)));
  }
  function removeField(i: number) {
    setFields(item.fields.filter((_, idx) => idx !== i));
  }

  return (
    <Paper withBorder radius="lg" p="lg" shadow="xs">
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Stack gap={0}>
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
            </Stack>
            <div>
              <Title order={4}>{item.title || "(fără titlu)"}</Title>
              <Group gap="xs" mt={2}>
                <Badge variant="light" color={item.kind === "service" ? "brand" : "blue"}>
                  {item.kind === "service" ? "Serviciu" : "Produs"}
                </Badge>
                {!item.is_active && (
                  <Badge variant="light" color="gray">
                    Inactiv
                  </Badge>
                )}
                <Text size="sm" c="dimmed">
                  {item.fields.length} câmpuri
                </Text>
              </Group>
            </div>
          </Group>
          <ActionIcon
            variant="subtle"
            color="red"
            size="lg"
            onClick={onRemove}
            aria-label="Șterge item-ul"
          >
            <Trash2 size={18} />
          </ActionIcon>
        </Group>

        <Group grow align="flex-start">
          <TextInput
            label="Titlu"
            value={item.title}
            onChange={(e) => patch({ title: e.currentTarget.value })}
          />
          <Select
            label="Tip"
            value={item.kind}
            allowDeselect={false}
            data={itemKinds.map((k) => ({
              value: k,
              label: k === "service" ? "Serviciu" : "Produs",
            }))}
            onChange={(v) => v && patch({ kind: v as ItemKind })}
          />
          <NumberInput
            label="Preț de bază (RON)"
            min={0}
            decimalScale={2}
            step={1}
            value={item.base_price}
            onChange={(v) =>
              patch({ base_price: typeof v === "number" ? v : 0 })
            }
          />
        </Group>

        <Textarea
          label="Descriere"
          autosize
          minRows={2}
          value={item.description ?? ""}
          onChange={(e) =>
            patch({ description: e.currentTarget.value || null })
          }
        />

        <Group>
          <Switch
            label="Necesită upload PDF"
            checked={item.requires_upload}
            onChange={(e) => patch({ requires_upload: e.currentTarget.checked })}
          />
          <Switch
            label="Activ"
            checked={item.is_active}
            onChange={(e) => patch({ is_active: e.currentTarget.checked })}
          />
        </Group>

        <Divider label="Câmpuri configurabile" labelPosition="left" />

        <Stack gap="sm">
          {item.fields.map((field, i) => (
            <FieldEditor
              key={i}
              field={field}
              numberFieldKeys={numberFieldKeys}
              onChange={(f) => updateField(i, f)}
              onRemove={() => removeField(i)}
              onMoveUp={i > 0 ? () => setFields(moveInArray(item.fields, i, i - 1)) : undefined}
              onMoveDown={
                i < item.fields.length - 1
                  ? () => setFields(moveInArray(item.fields, i, i + 1))
                  : undefined
              }
            />
          ))}

          <Menu shadow="md" position="bottom-start">
            <Menu.Target>
              <Button
                variant="light"
                leftSection={<Plus size={16} />}
                w="fit-content"
              >
                Adaugă câmp
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {fieldTypes.map((t) => (
                <Menu.Item key={t} onClick={() => addField(t)}>
                  {TYPE_LABELS[t]}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Stack>
      </Stack>
    </Paper>
  );
}
