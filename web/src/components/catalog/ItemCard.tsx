"use client";

import { useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Divider,
  Group,
  Menu,
  MultiSelect,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  fieldTypes,
  TEXT_MAX,
  type Category,
  type Field,
  type FieldType,
  type FileTypeKey,
  type Item,
} from "@/lib/catalog/schema";
import { newField } from "@/lib/catalog/factories";
import { FILE_TYPE_OPTIONS } from "@/lib/catalog/fileTypes";
import { itemImageUrl, mainImage } from "@/lib/catalog/images";
import { formatPrice, roCount } from "@/lib/utils/format";
import { FieldEditor } from "./FieldEditor";
import { ItemImages } from "./ItemImages";
import { ItemThumb } from "./ItemThumb";

const TYPE_LABELS: Record<FieldType, string> = {
  single_select: "Selecție unică",
  multi_select: "Selecție multiplă",
  boolean: "Da / Nu",
  number: "Număr",
  text: "Text liber",
};

/** A field row wrapped as a dnd-kit sortable, with its own drag handle. */
function SortableFieldEditor({
  id,
  field,
  numberFieldKeys,
  onChange,
  onRemove,
}: {
  /** Stable client-side row id — decoupled from the editable `field.key`. */
  id: string;
  field: Field;
  numberFieldKeys: string[];
  onChange: (f: Field) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const handle = (
    <ActionIcon
      variant="subtle"
      color="gray"
      size="sm"
      style={{ cursor: "grab" }}
      aria-label="Trage pentru reordonare"
      {...attributes}
      {...listeners}
    >
      <GripVertical size={15} />
    </ActionIcon>
  );
  return (
    <div ref={setNodeRef} style={style}>
      <FieldEditor
        field={field}
        numberFieldKeys={numberFieldKeys}
        onChange={onChange}
        onRemove={onRemove}
        dragHandle={handle}
      />
    </div>
  );
}

interface Props {
  item: Item;
  categories: Category[];
  onChange: (item: Item) => void;
  onRemove: () => void;
  dragHandle?: React.ReactNode;
}

export function ItemCard({ item, categories, onChange, onRemove, dragHandle }: Props) {
  const [open, setOpen] = useState(!item.title);

  // Stable client-side ids for the field rows. The schema identifies fields by `key`, but
  // `key` is user-editable — using it as the React/dnd id remounts the row on every keystroke
  // (collapsing it and dropping input focus). These ids are minted once per row and moved in
  // lockstep with the fields, so editing a key no longer remounts the row.
  const uidRef = useRef(0);
  const [fieldIds, setFieldIds] = useState<string[]>(() =>
    item.fields.map(() => `fld-${uidRef.current++}`)
  );
  // Reconcile if the fields array is replaced from outside (keeps ids aligned by position).
  useEffect(() => {
    setFieldIds((prev) =>
      prev.length === item.fields.length
        ? prev
        : item.fields.map((_, i) => prev[i] ?? `fld-${uidRef.current++}`)
    );
  }, [item.fields.length]);

  const patch = (changes: Partial<Item>) => onChange({ ...item, ...changes });
  const numberFieldKeys = item.fields.filter((f) => f.type === "number").map((f) => f.key);
  const setFields = (fields: Field[]) => onChange({ ...item, fields });
  const addField = (type: FieldType) => {
    setFieldIds((ids) => [...ids, `fld-${uidRef.current++}`]);
    setFields([...item.fields, newField(type, item.fields.length)]);
  };
  const updateField = (i: number, field: Field) =>
    setFields(item.fields.map((f, idx) => (idx === i ? field : f)));
  const removeField = (i: number) => {
    setFieldIds((ids) => ids.filter((_, idx) => idx !== i));
    setFields(item.fields.filter((_, idx) => idx !== i));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );
  function onFieldDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = fieldIds.indexOf(String(active.id));
    const newI = fieldIds.indexOf(String(over.id));
    if (oldI < 0 || newI < 0) return;
    setFieldIds((ids) => arrayMove(ids, oldI, newI));
    setFields(arrayMove(item.fields, oldI, newI));
  }

  const categoryName = categories.find((c) => c.id === item.category_id)?.name;
  const mainUrl = itemImageUrl(mainImage(item));

  return (
    <Paper withBorder radius="lg" shadow="xs">
      <Group justify="space-between" wrap="nowrap" gap="xs" p="md">
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
          {dragHandle}
          <ItemThumb src={mainUrl} size={40} radius="sm" />
          <div
            style={{ minWidth: 0, flex: 1, cursor: "pointer" }}
            onClick={() => setOpen((o) => !o)}
          >
            <Group gap="xs" wrap="nowrap">
              <Text fw={700} truncate>
                {item.title || "(fără titlu)"}
              </Text>
              <Badge variant="light" color={item.kind === "service" ? "brand" : "mist"}>
                {item.kind === "service" ? "Serviciu" : "Produs"}
              </Badge>
              {categoryName && (
                <Badge variant="light" color="slate">
                  {categoryName}
                </Badge>
              )}
              {!item.is_active && (
                <Badge variant="light" color="gray">
                  Inactiv
                </Badge>
              )}
            </Group>
            <Text fz="xs" c="dimmed" mt={2}>
              {roCount(item.fields.length, "câmp", "câmpuri")} · de la{" "}
              {formatPrice(item.base_price)}
            </Text>
          </div>
        </Group>
        <Group gap={4} wrap="nowrap">
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => setOpen((o) => !o)} aria-label="Editează item-ul">
            {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" size="lg" onClick={onRemove} aria-label="Șterge item-ul">
            <Trash2 size={18} />
          </ActionIcon>
        </Group>
      </Group>

      {open && (
        <Stack gap="md" px="md" pb="md">
          <Divider />
          <Group grow align="flex-start">
            <TextInput label="Titlu" maxLength={TEXT_MAX} value={item.title} onChange={(e) => patch({ title: e.currentTarget.value })} />
            <NumberInput
              label="Preț de bază (RON)"
              min={0}
              decimalScale={2}
              step={1}
              value={item.base_price}
              onChange={(v) => patch({ base_price: typeof v === "number" ? v : 0 })}
            />
            <NumberInput
              label="Cantitate minimă"
              description="Comanda minimă (ex. 100 buc.)"
              min={1}
              step={1}
              allowDecimal={false}
              value={item.min_quantity}
              onChange={(v) =>
                patch({ min_quantity: typeof v === "number" && v >= 1 ? Math.floor(v) : 1 })
              }
            />
          </Group>

          <Textarea
            label="Descriere"
            autosize
            minRows={2}
            maxLength={TEXT_MAX}
            value={item.description ?? ""}
            onChange={(e) => patch({ description: e.currentTarget.value || null })}
          />

          <Select
            label="Categorie (opțional)"
            placeholder={categories.length ? "Fără categorie" : "Adaugă categorii mai întâi"}
            clearable
            disabled={categories.length === 0}
            data={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={item.category_id}
            onChange={(v) => patch({ category_id: v })}
          />

          <Group>
            <Switch label="Necesită fișier atașat" checked={item.requires_upload} onChange={(e) => patch({ requires_upload: e.currentTarget.checked })} />
            <Switch label="Activ" checked={item.is_active} onChange={(e) => patch({ is_active: e.currentTarget.checked })} />
            <Switch label="În stoc" checked={item.in_stock} onChange={(e) => patch({ in_stock: e.currentTarget.checked })} />
          </Group>

          {item.requires_upload && (
            <MultiSelect
              label="Tipuri de fișiere acceptate"
              description="Clientul va putea încărca doar aceste tipuri."
              placeholder="Alege tipurile permise"
              data={FILE_TYPE_OPTIONS}
              value={item.accepted_file_types}
              onChange={(v) => patch({ accepted_file_types: v as FileTypeKey[] })}
            />
          )}

          <Divider label="Imagini" labelPosition="left" />
          <ItemImages images={item.images} onChange={(images) => patch({ images })} />

          <Divider label="Câmpuri configurabile" labelPosition="left" />

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onFieldDragEnd}>
            <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
              <Stack gap="sm">
                {item.fields.map((field, i) => (
                  <SortableFieldEditor
                    key={fieldIds[i]}
                    id={fieldIds[i]}
                    field={field}
                    numberFieldKeys={numberFieldKeys}
                    onChange={(f) => updateField(i, f)}
                    onRemove={() => removeField(i)}
                  />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>

          <Menu shadow="md" position="bottom-start">
            <Menu.Target>
              <Button variant="light" leftSection={<Plus size={16} />} w="fit-content">
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
      )}
    </Paper>
  );
}
