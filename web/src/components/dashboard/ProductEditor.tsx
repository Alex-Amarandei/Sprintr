"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  Group,
  NumberInput,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { Check, Image as ImageIcon, Package } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils/format";
import { LinkButton } from "@/components/ui/links";

export interface ProductDraft {
  name: string;
  description: string;
  basePrice: number;
  unit: string;
  sku: string;
  inStock: boolean;
}

const BLANK: ProductDraft = {
  name: "",
  description: "",
  basePrice: 0,
  unit: "buc",
  sku: "",
  inStock: true,
};

export function ProductEditor({
  mode,
  initial,
}: {
  mode: "new" | "edit";
  initial?: ProductDraft;
}) {
  const router = useRouter();
  const [p, setP] = useState<ProductDraft>(initial ?? BLANK);
  const set = <K extends keyof ProductDraft>(k: K, v: ProductDraft[K]) =>
    setP((prev) => ({ ...prev, [k]: v }));

  function save() {
    // TODO(BE): persist into the shop's catalog draft (kind: "product").
    toast.success(
      mode === "new" ? "Produs adăugat" : "Modificările au fost salvate",
    );
    router.push("/dashboard/products");
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
        <div>
          <Title order={2}>
            {mode === "new" ? "Adaugă produs" : "Editează produs"}
          </Title>
          <Text c="dimmed">
            Configurează detaliile. Clientul va vedea exact ce setezi aici.
          </Text>
        </div>
        <Group>
          <LinkButton
            href="/dashboard/products"
            variant="default"
            color="stone.1"
          >
            Anulează
          </LinkButton>
          <Button leftSection={<Check size={16} />} onClick={save}>
            Salvează
          </Button>
        </Group>
      </Group>

      <Group align="flex-start" gap="lg" wrap="nowrap">
        {/* Form */}
        <Stack gap="lg" style={{ flex: 1, minWidth: 0 }}>
          <Card>
            <Text fw={700} mb="md">
              Detalii generale
            </Text>
            <Group align="flex-start" gap="md" wrap="nowrap">
              <Stack gap="xs" align="center" mt={25}>
                <ThemeIcon variant="light" color="mist" size={88} radius="lg">
                  <Package size={36} />
                </ThemeIcon>
                <Button
                  variant="default"
                  size="xs"
                  leftSection={<ImageIcon size={14} />}
                >
                  Schimbă
                </Button>
              </Stack>
              <Stack gap="sm" style={{ flex: 1, minWidth: 0 }}>
                <TextInput
                  label="Denumire produs"
                  placeholder="Pix Pilot G-2 0.7mm"
                  value={p.name}
                  onChange={(e) => set("name", e.currentTarget.value)}
                />
                <Textarea
                  label="Descriere"
                  placeholder="Scurtă descriere a produsului…"
                  autosize
                  minRows={2}
                  value={p.description}
                  onChange={(e) => set("description", e.currentTarget.value)}
                />
              </Stack>
            </Group>

            <Group grow mt="sm">
              <NumberInput
                label="Preț de bază"
                suffix=" lei"
                min={0}
                decimalScale={2}
                value={p.basePrice}
                onChange={(v) =>
                  set("basePrice", typeof v === "number" ? v : 0)
                }
              />
              <TextInput
                label="Unitate"
                placeholder="buc"
                value={p.unit}
                onChange={(e) => set("unit", e.currentTarget.value)}
              />
              <TextInput
                label="Cod intern (SKU)"
                placeholder="PIX-001"
                value={p.sku}
                onChange={(e) => set("sku", e.currentTarget.value)}
              />
            </Group>
          </Card>

          <Card>
            <Text fw={700} mb="md">
              Stoc & disponibilitate
            </Text>
            <Switch
              label="Produs în stoc"
              description="Dacă e dezactivat, clienții nu îl pot comanda."
              checked={p.inStock}
              onChange={(e) => set("inStock", e.currentTarget.checked)}
            />
          </Card>
        </Stack>

        {/* Live preview */}
        <Box w={320} visibleFrom="md" style={{ flexShrink: 0 }}>
          <Text
            tt="uppercase"
            fz="xs"
            fw={700}
            c="brand.6"
            mb="sm"
            style={{ letterSpacing: 0.6 }}
          >
            Previzualizare live
          </Text>
          <Card>
            <Group justify="space-between" mb="sm">
              <ThemeIcon variant="light" color="mist" size={48} radius="md">
                <Package size={22} />
              </ThemeIcon>
              {p.inStock && (
                <Text fz="xs" fw={600} c="teal.7">
                  În stoc
                </Text>
              )}
            </Group>
            <Text fw={700}>{p.name || "Nume produs"}</Text>
            {p.description && (
              <Text fz="xs" c="dimmed" lineClamp={2} mt={2}>
                {p.description}
              </Text>
            )}
            <Group justify="space-between" mt="md">
              <Text fw={700}>{formatPrice(p.basePrice)}</Text>
              <Button size="xs" disabled>
                Adaugă în coș
              </Button>
            </Group>
          </Card>
        </Box>
      </Group>
    </Stack>
  );
}
