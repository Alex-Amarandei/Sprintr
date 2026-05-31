import { Badge, Card, Group, Stack, Text } from "@mantine/core";
import { Tag } from "lucide-react";
import type { OfferRow } from "@/lib/offers/types";

/** Value chip for a customer-facing offer (e.g. "−10%", "−15 lei", "2+1 gratuit"). */
function valueLabel(o: OfferRow): string {
  const c = (o.config ?? {}) as { percent?: number; amount?: number; buy?: number; get?: number };
  if (o.type === "percent") return `−${c.percent ?? 0}%`;
  if (o.type === "fixed") return `−${c.amount ?? 0} lei`;
  if (o.type === "bxgy") return `${c.buy ?? 0}+${c.get ?? 0} gratuit`;
  return "Livrare gratuită";
}

/**
 * Live automatic promotions for a shop (storefront banner). These apply on their own at
 * checkout — no code needed. Renders nothing when the shop has no active offers.
 */
export function ShopOffers({ offers }: { offers: OfferRow[] }) {
  if (offers.length === 0) return null;

  return (
    <Card
      mx="md"
      style={{
        background:
          "linear-gradient(120deg, var(--mantine-color-ink-9), var(--mantine-color-brand-6))",
      }}
    >
      <Group gap={6} mb="sm">
        <Tag size={15} color="var(--mantine-color-brand-1)" />
        <Text tt="uppercase" fz="xs" fw={700} c="brand.1" style={{ letterSpacing: 0.6 }}>
          {offers.length > 1 ? "Promoții active" : "Promoție activă"}
        </Text>
      </Group>
      <Stack gap="sm">
        {offers.map((o) => (
          <Group key={o.id} gap="md" wrap="nowrap" align="flex-start">
            <Badge size="lg" variant="white" color="brand" style={{ flexShrink: 0 }}>
              {valueLabel(o)}
            </Badge>
            <div style={{ minWidth: 0 }}>
              <Text fw={700} c="white">
                {o.name}
              </Text>
              {o.description && (
                <Text c="gray.3" fz="sm" mt={2}>
                  {o.description}
                </Text>
              )}
            </div>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}
