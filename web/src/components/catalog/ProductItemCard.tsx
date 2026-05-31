"use client";

import {
  ActionIcon,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Textarea,
  TextInput,
} from "@mantine/core";
import { Trash2 } from "lucide-react";
import { TEXT_MAX, type Category, type Item } from "@/lib/catalog/schema";
import { itemImageUrl, mainImage } from "@/lib/catalog/images";
import { ItemImages } from "./ItemImages";
import { ItemThumb } from "./ItemThumb";

interface Props {
  item: Item;
  categories: Category[];
  onChange: (item: Item) => void;
  onRemove: () => void;
  dragHandle?: React.ReactNode;
}

/**
 * Editor card for a PRODUCT — a standalone good (pen, t-shirt, set of badges…).
 * Unlike a service it is NOT configurable: no fields, options, price rules or file
 * upload — just an image, a name, a price, an optional description + category, and an
 * active toggle. The price is the product's `base_price`; the customer simply adds it
 * to the cart (quantity is handled at cart level, not configured here).
 */
export function ProductItemCard({ item, categories, onChange, onRemove, dragHandle }: Props) {
  const patch = (changes: Partial<Item>) => onChange({ ...item, ...changes });
  const mainUrl = itemImageUrl(mainImage(item));

  return (
    <Paper withBorder radius="lg" shadow="xs" p="md" opacity={item.is_active ? 1 : 0.65}>
      <Stack gap="sm">
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--mantine-spacing-md)", flexWrap: "nowrap" }}>
          {dragHandle}

          {/* Main image (first of the gallery below) — icon placeholder when none. */}
          <ItemThumb src={mainUrl} size={56} radius="md" />

          <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: "var(--mantine-spacing-sm)", alignItems: "flex-end", flexWrap: "wrap" }}>
              <TextInput
                label="Nume produs"
                placeholder="ex. Pix Pilot, tricou, set insigne"
                maxLength={TEXT_MAX}
                value={item.title}
                onChange={(e) => patch({ title: e.currentTarget.value })}
                style={{ flex: 1, minWidth: 180 }}
              />
              <NumberInput
                label="Preț (RON)"
                w={130}
                min={0}
                decimalScale={2}
                step={1}
                value={item.base_price}
                onChange={(v) => patch({ base_price: typeof v === "number" ? v : 0 })}
              />
            </div>

            <Select
              label="Categorie (opțional)"
              placeholder={categories.length ? "Fără categorie" : "Adaugă categorii mai întâi"}
              clearable
              disabled={categories.length === 0}
              data={categories.map((c) => ({ value: c.id, label: c.name }))}
              value={item.category_id}
              onChange={(v) => patch({ category_id: v })}
            />

            <Textarea
              label="Descriere (opțional)"
              autosize
              minRows={1}
              maxLength={TEXT_MAX}
              placeholder="ex. Pix cu gel, albastru, 0.5mm"
              value={item.description ?? ""}
              onChange={(e) => patch({ description: e.currentTarget.value || null })}
            />

            <Switch
              label="Disponibil"
              checked={item.is_active}
              onChange={(e) => patch({ is_active: e.currentTarget.checked })}
            />

            <ItemImages images={item.images} onChange={(images) => patch({ images })} />
          </Stack>

          <ActionIcon
            variant="subtle"
            color="red"
            size="lg"
            onClick={onRemove}
            aria-label="Șterge produsul"
            style={{ flexShrink: 0 }}
          >
            <Trash2 size={18} />
          </ActionIcon>
        </div>
      </Stack>
    </Paper>
  );
}
