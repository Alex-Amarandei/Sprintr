"use client";

import { useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import {
  Button,
  Group,
  Image,
  Modal,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { FileText, Package, Plus, Settings2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import type { Item } from "@/lib/catalog/schema";
import type { CartLine } from "@/lib/catalog/cart";
import { buildCartLine, needsConfiguration } from "@/lib/catalog/cart";
import { computeItemPrice } from "@/lib/catalog/pricing";
import { defaultAnswers } from "@/lib/catalog/answers";
import { itemImageUrl, mainImage } from "@/lib/catalog/images";
import { formatPrice } from "@/lib/utils/format";
import { ItemOrderForm } from "@/components/catalog/ItemOrderForm";
import { ImageLightbox } from "@/components/catalog/ImageLightbox";
import { useCart } from "./CartContext";

export function AddItemCard({
  item,
  shopId,
  shopName,
  shopOpen,
  shopDeliveryFee,
}: {
  item: Item;
  shopId: string;
  shopName: string;
  shopOpen: boolean;
  shopDeliveryFee: number;
}) {
  const {
    addLine,
    clear,
    count,
    shopId: cartShopId,
    shopName: cartShopName,
  } = useCart();
  const [opened, { open, close }] = useDisclosure(false);
  const [conflict, { open: openConflict, close: closeConflict }] =
    useDisclosure(false);
  const [pendingLine, setPendingLine] = useState<CartLine | null>(null);
  const configurable = needsConfiguration(item);

  // "from" price for the card (base + defaults)
  const fromPrice = computeItemPrice(item, defaultAnswers(item)).total;

  const kindColor = item.kind === "service" ? "brand" : "blue";
  const mainUrl = itemImageUrl(mainImage(item));
  const gallery = item.images.length ? item.images : item.image_path ? [item.image_path] : [];
  const [zoom, setZoom] = useState<number | null>(null);

  const shop = { id: shopId, name: shopName, open: shopOpen, deliveryFee: shopDeliveryFee };

  /** Adds the line, unless the cart already holds items from a different shop. */
  function tryAdd(line: CartLine) {
    if (count > 0 && cartShopId && cartShopId !== shopId) {
      setPendingLine(line);
      openConflict();
      return;
    }
    addLine(line, shop);
    toast.success(`${item.title} adăugat în coș`);
  }

  function confirmSwitch() {
    if (pendingLine) {
      clear();
      addLine(pendingLine, shop);
      toast.success(`${item.title} adăugat în coș`);
    }
    setPendingLine(null);
    closeConflict();
  }

  return (
    <Paper withBorder radius="lg" p="lg" className="catalog-card">
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
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <Tooltip
              label={item.kind === "service" ? "Serviciu" : "Produs"}
              withArrow
            >
              <ThemeIcon
                variant="light"
                color={kindColor}
                size={40}
                radius="md"
                // Real bg/color props (not the --ti-* vars, which Mantine sets
                // inline itself) so the icon looks identical in dark and light mode.
                styles={{
                  root: {
                    backgroundColor: `var(--mantine-color-${kindColor}-1)`,
                    color: `var(--mantine-color-${kindColor}-7)`,
                    flexShrink: 0,
                  },
                }}
              >
                {item.kind === "service" ? (
                  <FileText size={18} />
                ) : (
                  <Package size={18} />
                )}
              </ThemeIcon>
            </Tooltip>
            <Text fw={600} fz="sm" lh={1.3} lineClamp={2} style={{ flex: 1 }}>
              {item.title}
            </Text>
          </Group>
          {item.description && (
            <Text c="dimmed" fz="xs" lineClamp={2} mt="sm">
              {item.description}
            </Text>
          )}
        </div>

        <Group justify="space-between" align="flex-end" wrap="nowrap" mt="xs">
          <div>
            <Text tt="uppercase" fz={9} fw={700} c="dimmed" lh={1} mb={3}>
              {configurable ? "de la" : "preț"}
            </Text>
            <Text fw={800} fz="lg" lh={1} c="var(--mantine-color-text)">
              {formatPrice(fromPrice)}
            </Text>
          </div>
          {/* Simple text-style action (no filled container) — keeps the card clean. */}
          {configurable ? (
            <Button
              leftSection={<Settings2 size={15} />}
              onClick={open}
              variant="subtle"
              color="brand"
              size="compact-sm"
              px={6}
            >
              Configurează
            </Button>
          ) : (
            <Button
              leftSection={<Plus size={15} />}
              onClick={() => tryAdd(buildCartLine(item))}
              variant="subtle"
              color="brand"
              size="compact-sm"
              px={6}
            >
              Adaugă
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
          styles={{
            // Solid surface — the modal was reading semi-transparent over the page.
            content: { backgroundColor: "light-dark(#ffffff, var(--mantine-color-dark-7))" },
            header: {
              alignItems: "flex-start",
              backgroundColor: "light-dark(#ffffff, var(--mantine-color-dark-7))",
            },
          }}
        >
          <ItemOrderForm
            item={item}
            submitLabel="Adaugă în coș"
            onPlaceOrder={(p) => {
              tryAdd(buildCartLine(item, p.answers, p.files));
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

      {/* Cross-shop conflict confirmation */}
      <Modal
        opened={conflict}
        onClose={closeConflict}
        withCloseButton={false}
        centered
        size="sm"
        padding="xl"
      >
        <Stack align="center" gap="sm">
          <ThemeIcon variant="light" color="red" size={56} radius="xl">
            <ShoppingCart size={26} />
          </ThemeIcon>
          <Text fw={800} fz="lg" ta="center" c="var(--mantine-color-text)">
            Coș de la alt magazin
          </Text>
          <Text c="dimmed" ta="center" fz="sm">
            Există deja produse în coș de la{" "}
            <Text span fw={700} c="var(--mantine-color-text)">
              {cartShopName}
            </Text>
            . Pentru a continua cu selecția curentă, golește coșul.
          </Text>
          <Group grow w="100%" mt="md" gap="sm">
            <Button variant="default" onClick={closeConflict}>
              Anulează
            </Button>
            <Button color="red" onClick={confirmSwitch}>
              Golește coșul
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}
