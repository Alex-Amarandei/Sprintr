"use client";

import { useDisclosure } from "@mantine/hooks";
import {
  Badge,
  Button,
  Group,
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
import { formatPrice } from "@/lib/utils/format";
import { ItemOrderForm } from "@/components/catalog/ItemOrderForm";
import { useCart } from "./CartContext";

export function AddItemCard({ item, shopId }: { item: Item; shopId: string }) {
  const { addLine } = useCart();
  const [opened, { open, close }] = useDisclosure(false);
  const configurable = needsConfiguration(item);

  // "from" price for the card (base + defaults)
  const fromPrice = computeItemPrice(item, defaultAnswers(item)).total;

  function quickAdd() {
    addLine(buildCartLine(item), shopId);
    toast.success(`${item.title} adăugat în coș`);
  }

  return (
    <Paper withBorder radius="lg" p="lg" shadow="xs">
      <Stack gap="sm" h="100%" justify="space-between">
        <div>
          <Group justify="space-between" wrap="nowrap" align="flex-start">
            <Title order={4}>{item.title}</Title>
            <Badge variant="light" color={item.kind === "service" ? "brand" : "blue"}>
              {item.kind === "service" ? "Serviciu" : "Produs"}
            </Badge>
          </Group>
          {item.description && (
            <Text c="dimmed" size="sm" mt={4}>
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
            <Button leftSection={<Settings2 size={16} />} onClick={open} variant="light">
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
          title={`Configurează: ${item.title}`}
          size="lg"
          centered
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
                  fileName: p.fileName,
                },
                shopId
              );
              toast.success(`${item.title} adăugat în coș`);
              close();
            }}
          />
        </Modal>
      )}
    </Paper>
  );
}
