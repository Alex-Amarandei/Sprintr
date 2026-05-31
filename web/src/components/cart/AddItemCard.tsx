"use client";

import { useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import {
  Badge,
  Button,
  Group,
  Image,
  Modal,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import type { Item } from "@/lib/catalog/schema";
import { buildCartLine, needsConfiguration } from "@/lib/catalog/cart";
import { computeItemPrice } from "@/lib/catalog/pricing";
import { defaultAnswers } from "@/lib/catalog/answers";
import { itemImageUrl, mainImage } from "@/lib/catalog/images";
import { formatPrice } from "@/lib/utils/format";
import { ItemOrderForm } from "@/components/catalog/ItemOrderForm";
import { ImageLightbox } from "@/components/catalog/ImageLightbox";
import { useCart } from "./CartContext";

export function AddItemCard({ item, shopId }: { item: Item; shopId: string }) {
  const { addLine } = useCart();
  const [opened, { open, close }] = useDisclosure(false);
  const configurable = needsConfiguration(item);

  // "from" price for the card (base + defaults)
  const fromPrice = computeItemPrice(item, defaultAnswers(item)).total;

  const kindColor = item.kind === "service" ? "brand" : "blue";
  const mainUrl = itemImageUrl(mainImage(item));
  const gallery = item.images.length ? item.images : item.image_path ? [item.image_path] : [];
  const [zoom, setZoom] = useState<number | null>(null);

  function quickAdd() {
    addLine(buildCartLine(item), shopId);
    toast.success(`${item.title} adăugat în coș`);
  }

  return (
    <Paper withBorder radius="lg" p="lg" shadow="xs">
      <Stack gap="sm" h="100%" justify="space-between">
        {mainUrl && (
          <Image
            src={mainUrl}
            h={140}
            radius="md"
            fit="cover"
            alt={item.title}
            onClick={() => setZoom(0)}
            style={{ cursor: "zoom-in" }}
          />
        )}
        <div>
          <Group justify="space-between" wrap="nowrap" align="flex-start">
            <Title order={4}>{item.title}</Title>
            <Badge
              variant="light"
              color={kindColor}
              // Real bg/color props (not the --badge-* vars, which Mantine sets
              // inline itself) so the badge looks identical in dark and light mode.
              styles={{
                root: {
                  backgroundColor: `var(--mantine-color-${kindColor}-1)`,
                  color: `var(--mantine-color-${kindColor}-7)`,
                },
              }}
            >
              {item.kind === "service" ? "Serviciu" : "Produs"}
            </Badge>
          </Group>
          {item.description && (
            <Text c="dimmed" fz="xs" mt={4}>
              {item.description}
            </Text>
          )}
        </div>

        <Group justify="space-between" mt="sm">
          <Text fw={600}>
            {configurable ? "de la " : ""}
            {formatPrice(fromPrice)}
          </Text>
          {configurable ? (
            <Button
              leftSection={<Settings2 size={16} />}
              onClick={open}
              variant="light"
              // Real bg/color props (not the --button-* vars, which Mantine sets
              // inline itself) so the button looks identical in dark and light mode.
              styles={{
                root: {
                  backgroundColor: "var(--mantine-color-brand-1)",
                  color: "var(--mantine-color-brand-7)",
                },
              }}
            >
              Configurează
            </Button>
          ) : (
            <Button leftSection={<Plus size={16} />} onClick={quickAdd}>
              Adaugă în coș
            </Button>
          )}
        </Group>
      </Stack>

      {configurable && (
        <Modal
          opened={opened}
          onClose={close}
          title={
            <div>
              <Text fw={800} fz="lg" lh={1.2} c="var(--mantine-color-text)">
                Configurează: {item.title}
              </Text>
              {item.description && (
                <Text fz="sm" c="dimmed" mt={4}>
                  {item.description}
                </Text>
              )}
            </div>
          }
          size="lg"
          padding="xl"
          centered
          styles={{ header: { alignItems: "flex-start" } }}
        >
          <ItemOrderForm
            item={item}
            submitLabel="Adaugă în coș"
            onPlaceOrder={(p) => {
              addLine(
                {
                  lineId: crypto.randomUUID(),
                  itemId: p.itemId,
                  title: item.title,
                  kind: item.kind,
                  answers: p.answers,
                  total: p.total,
                  files: p.files,
                },
                shopId
              );
              toast.success(`${item.title} adăugat în coș`);
              close();
            }}
          />
        </Modal>
      )}

      <ImageLightbox
        images={gallery}
        index={zoom ?? 0}
        opened={zoom !== null}
        onIndexChange={setZoom}
        onClose={() => setZoom(null)}
      />
    </Paper>
  );
}
