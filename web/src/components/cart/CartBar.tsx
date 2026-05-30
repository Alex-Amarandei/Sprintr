"use client";

import { useDisclosure } from "@mantine/hooks";
import {
  ActionIcon,
  Badge,
  Button,
  Divider,
  Drawer,
  Group,
  Indicator,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils/format";
import { useCart } from "./CartContext";

export function CartBar() {
  const { lines, count, total, removeLine, clear } = useCart();
  const [opened, { open, close }] = useDisclosure(false);

  function checkout() {
    console.log("[cart checkout preview]", { lines, total });
    toast.success(
      `Comandă (preview): ${count} produse · ${formatPrice(total)} — vezi consola`
    );
  }

  return (
    <>
      <Indicator label={count} size={18} disabled={count === 0} color="brand">
        <Button
          variant="default"
          leftSection={<ShoppingCart size={18} />}
          onClick={open}
        >
          {formatPrice(total)}
        </Button>
      </Indicator>

      <Drawer
        opened={opened}
        onClose={close}
        position="right"
        title="Coșul tău"
        size="md"
      >
        {lines.length === 0 ? (
          <Text c="dimmed" ta="center" mt="xl">
            Coșul este gol.
          </Text>
        ) : (
          <Stack gap="sm">
            {lines.map((l) => (
              <Paper key={l.lineId} withBorder radius="md" p="sm">
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                  <div style={{ minWidth: 0 }}>
                    <Group gap="xs">
                      <Text fw={500} truncate>
                        {l.title}
                      </Text>
                      <Badge size="xs" variant="light" color={l.kind === "service" ? "brand" : "blue"}>
                        {l.kind === "service" ? "Serviciu" : "Produs"}
                      </Badge>
                    </Group>
                    {l.fileName && (
                      <Text size="xs" c="dimmed" truncate>
                        📎 {l.fileName}
                      </Text>
                    )}
                  </div>
                  <Group gap="xs" wrap="nowrap">
                    <Text fw={600}>{formatPrice(l.total)}</Text>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => removeLine(l.lineId)}
                      aria-label="Elimină"
                    >
                      <Trash2 size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Paper>
            ))}

            <Divider />
            <Group justify="space-between">
              <Text fw={700}>Total</Text>
              <Text fw={700} fz="xl" c="brand.7">
                {formatPrice(total)}
              </Text>
            </Group>
            <Button size="md" onClick={checkout}>
              Finalizează comanda
            </Button>
            <Button variant="subtle" color="gray" onClick={clear}>
              Golește coșul
            </Button>
          </Stack>
        )}
      </Drawer>
    </>
  );
}
