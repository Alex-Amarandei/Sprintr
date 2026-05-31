"use client";

import { useState } from "react";
import {
  Badge,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { ChevronDown } from "lucide-react";
import type { Category, Field, Item, PriceRule } from "@/lib/catalog/schema";
import { acceptedLabel } from "@/lib/catalog/fileTypes";
import { itemImageUrl, mainImage } from "@/lib/catalog/images";
import { formatPrice } from "@/lib/utils/format";
import { ItemThumb } from "./ItemThumb";

const FIELD_TYPE_LABEL: Record<Field["type"], string> = {
  single_select: "O alegere",
  multi_select: "Alegeri multiple",
  boolean: "Da / Nu",
  number: "Număr",
  text: "Text",
};

/** "+12,00 RON" / "+2,00 RON / unitate" for an optional price rule, or null when free. */
function priceLabel(p?: PriceRule): string | null {
  if (!p || !p.amount) return null;
  const base = `+${formatPrice(p.amount)}`;
  return p.mode === "per_unit" ? `${base} / unitate` : base;
}

function FieldDetails({ field }: { field: Field }) {
  return (
    <Stack gap={4}>
      <Group gap="xs" wrap="nowrap">
        <Text fz="sm" fw={600}>
          {field.label}
        </Text>
        <Badge size="xs" variant="light" color="stone">
          {FIELD_TYPE_LABEL[field.type]}
        </Badge>
        {field.required && (
          <Badge size="xs" variant="light" color="brand">
            obligatoriu
          </Badge>
        )}
        {field.type === "number" && field.is_quantity && (
          <Badge size="xs" variant="light" color="stone">
            cantitate
          </Badge>
        )}
      </Group>

      {/* Options for select fields, with any add-on price. */}
      {(field.type === "single_select" || field.type === "multi_select") &&
        field.options.length > 0 && (
          <Stack gap={2} pl="sm">
            {field.options.map((o) => {
              const pl = priceLabel(o.price);
              return (
                <Group key={o.value} gap="xs" justify="space-between" wrap="nowrap">
                  <Text fz="xs" c="dimmed">
                    • {o.label}
                  </Text>
                  {pl && (
                    <Text fz="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                      {pl}
                    </Text>
                  )}
                </Group>
              );
            })}
          </Stack>
        )}

      {/* Number range / unit. */}
      {field.type === "number" && (
        <Text fz="xs" c="dimmed" pl="sm">
          {field.min}
          {field.max != null ? `–${field.max}` : "+"}
          {field.unit ? ` ${field.unit}` : ""}
          {priceLabel(field.price) ? ` · ${priceLabel(field.price)}` : ""}
        </Text>
      )}

      {/* Boolean add-on price. */}
      {field.type === "boolean" && priceLabel(field.price) && (
        <Text fz="xs" c="dimmed" pl="sm">
          {priceLabel(field.price)}
        </Text>
      )}
    </Stack>
  );
}

/**
 * Read-only, expandable catalog item card for view-only mode (no edit rights). Shows the
 * same details an editor would configure — description, category, configurable fields with
 * their options/prices, upload requirements — without any inputs.
 */
export function ItemReadOnlyCard({
  item,
  categories,
}: {
  item: Item;
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  const categoryName = categories.find((c) => c.id === item.category_id)?.name;
  const hasDetails =
    item.fields.length > 0 ||
    !!item.description ||
    item.requires_upload ||
    !!categoryName;

  return (
    <Paper withBorder radius="lg" p="md">
      <UnstyledButton
        onClick={() => hasDetails && setOpen((o) => !o)}
        style={{ width: "100%", cursor: hasDetails ? "pointer" : "default" }}
      >
        <Group justify="space-between" wrap="nowrap" gap="sm">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <ItemThumb src={itemImageUrl(mainImage(item))} size={40} radius="sm" />
            <div style={{ minWidth: 0 }}>
              <Group gap="xs" wrap="nowrap">
                <Text fw={600} truncate>
                  {item.title || "(fără titlu)"}
                </Text>
                {!item.is_active && (
                  <Badge size="xs" variant="light" color="stone">
                    nelistat
                  </Badge>
                )}
                {!item.in_stock && (
                  <Badge size="xs" variant="light" color="red">
                    indisponibil
                  </Badge>
                )}
              </Group>
              <Text fz="xs" c="dimmed">
                {item.kind === "service" ? "Serviciu" : "Produs"} · de la{" "}
                {formatPrice(item.base_price)}
              </Text>
            </div>
          </Group>
          {hasDetails && (
            <ChevronDown
              size={18}
              style={{
                flexShrink: 0,
                transition: "transform 150ms",
                transform: open ? "rotate(180deg)" : "none",
                color: "var(--mantine-color-dimmed)",
              }}
            />
          )}
        </Group>
      </UnstyledButton>

      {open && (
        <>
          <Divider my="sm" />
          <Stack gap="sm">
            {item.description && (
              <Text fz="sm" c="dimmed">
                {item.description}
              </Text>
            )}
            {categoryName && (
              <Text fz="xs" c="dimmed">
                Categorie: <b>{categoryName}</b>
              </Text>
            )}
            {item.requires_upload && (
              <Text fz="xs" c="dimmed">
                Necesită fișier: {acceptedLabel(item.accepted_file_types)}
              </Text>
            )}
            {item.fields.length > 0 && (
              <Stack gap="sm">
                {item.fields.map((f) => (
                  <FieldDetails key={f.key} field={f} />
                ))}
              </Stack>
            )}
          </Stack>
        </>
      )}
    </Paper>
  );
}
