"use client";

import { useDisclosure } from "@mantine/hooks";
import {
  ActionIcon,
  Button,
  Divider,
  Drawer,
  Group,
  Indicator,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { ArrowRight, FileText, Package, ShoppingCart, Trash2 } from "lucide-react";
import { formatPrice, roCount } from "@/lib/utils/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCart } from "./CartContext";
import { CheckoutModal } from "./CheckoutModal";

export function CartBar() {
  const { lines, count, total, removeLine, clear } = useCart();
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [checkoutOpened, { open: openCheckout, close: closeCheckout }] = useDisclosure(false);

  return (
    <>
      <CheckoutModal opened={checkoutOpened} onClose={closeCheckout} />

      <Indicator label={count} size={18} disabled={count === 0} color="brand">
        <Button
          variant="default"
          leftSection={<ShoppingCart size={18} />}
          onClick={openDrawer}
        >
          {formatPrice(total)}
        </Button>
      </Indicator>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        position="right"
        size="md"
        padding="lg"
        title={
          <div>
            <Text fw={800} fz="lg" c="var(--mantine-color-text)">
              Coșul tău
            </Text>
            {count > 0 && (
              <Text fz="sm" c="dimmed">
                {roCount(count, "produs", "produse")}
              </Text>
            )}
          </div>
        }
        styles={{ header: { alignItems: "flex-start" } }}
      >
        {lines.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart size={26} />}
            title="Coșul este gol"
            description="Adaugă produse sau servicii dintr-un magazin ca să începi o comandă."
          />
        ) : (
          <Stack gap="md">
            <Stack gap="sm">
              {lines.map((l) => {
                const Icon = l.kind === "service" ? FileText : Package;
                return (
                  <Paper key={l.lineId} withBorder radius="md" p="sm">
                    <Group justify="space-between" wrap="nowrap" align="flex-start">
                      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                        <ThemeIcon variant="light" color="mist" size={40} radius="md">
                          <Icon size={18} />
                        </ThemeIcon>
                        <div style={{ minWidth: 0 }}>
                          <Text fw={600} fz="sm" truncate>
                            {l.title}
                          </Text>
                          <Text fz="xs" c="dimmed" truncate>
                            {l.fileName ?? (l.kind === "service" ? "Serviciu" : "Produs")}
                          </Text>
                        </div>
                      </Group>
                      <Group gap={4} wrap="nowrap">
                        <Text fw={700} fz="sm" style={{ whiteSpace: "nowrap" }}>
                          {formatPrice(l.total)}
                        </Text>
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
                );
              })}
            </Stack>

            {/* Summary */}
            <Paper withBorder radius="md" p="md" bg="var(--mantine-color-body)">
              <Group justify="space-between" mb={6}>
                <Text fz="sm" c="dimmed">
                  Subtotal
                </Text>
                <Text fz="sm">{formatPrice(total)}</Text>
              </Group>
              <Group justify="space-between" mb="xs">
                <Text fz="sm" c="dimmed">
                  Livrare
                </Text>
                <Text fz="sm" c="dimmed">
                  Calculată la finalizare
                </Text>
              </Group>
              <Divider mb="xs" />
              <Group justify="space-between">
                <Text fw={700}>Total</Text>
                <Text fw={800} fz="xl" c="var(--mantine-color-text)">
                  {formatPrice(total)}
                </Text>
              </Group>
            </Paper>

            <Button
              size="md"
              fullWidth
              rightSection={<ArrowRight size={16} />}
              onClick={() => {
                closeDrawer();
                openCheckout();
              }}
            >
              Finalizează comanda
            </Button>
            <Button variant="subtle" color="gray" fullWidth onClick={clear}>
              Golește coșul
            </Button>
          </Stack>
        )}
      </Drawer>
    </>
  );
}
