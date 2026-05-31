import Link from "next/link";
import { Badge, Box, Card, Group, Stack, Text } from "@mantine/core";
import { Clock, Star } from "lucide-react";
import type { SampleShop } from "@/lib/catalog/samples";
import { OpenBadge } from "@/components/ui/OpenBadge";
import { roCount } from "@/lib/utils/format";
import { SHOP_CATEGORY } from "./category";

export function ShopCard({ shop }: { shop: SampleShop }) {
  const cat = SHOP_CATEGORY[shop.category ?? "print"];
  const Icon = cat.icon;
  const open = shop.isOpen ?? true;

  return (
    <Link
      href={`/shop/${shop.id}`}
      style={{ textDecoration: "none", display: "block", height: "100%" }}
    >
    <Card
      p={0}
      withBorder
      style={{
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        opacity: open ? 1 : 0.65,
      }}
    >
      {/* Gradient header with category icon + rating + open state */}
      <Box
        h={132}
        p="sm"
        style={{
          background: cat.gradient,
          position: "relative",
          filter: open ? undefined : "grayscale(1)",
        }}
      >
        <Group justify="space-between">
          {shop.rating != null && (
            <Group
              gap={4}
              px={8}
              py={3}
              style={{ background: "rgba(0,0,0,0.35)", borderRadius: 8 }}
            >
              <Star size={13} fill="white" color="white" />
              <Text fz="xs" fw={700} c="white">
                {shop.rating.toFixed(1)}
              </Text>
            </Group>
          )}
          <OpenBadge open={open} />
        </Group>
        <Icon
          size={40}
          color="white"
          strokeWidth={1.75}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -30%)",
            opacity: 0.95,
          }}
        />
      </Box>

      {/* Body */}
      <Stack gap="xs" p="md" justify="space-between" style={{ flex: 1 }}>
        <div>
          <Text fw={700} c="var(--mantine-color-text)">
            {shop.name}
          </Text>
          <Text fz="xs" c="dimmed" lineClamp={2} mt={2}>
            {shop.description}
          </Text>
          {shop.tags && shop.tags.length > 0 && (
            <Group gap={6} mt="sm">
              {shop.tags.map((t) => (
                <Badge key={t} variant="light" color="mist" size="sm">
                  {t}
                </Badge>
              ))}
            </Group>
          )}
        </div>

        <Group justify="space-between" mt="xs" wrap="nowrap">
          <Group gap={4} c={open ? "dimmed" : "red.7"}>
            <Clock size={14} />
            <Text fz="xs" fw={open ? 400 : 600}>
              {open ? shop.eta ?? "—" : `Deschide la ${shop.opensAt ?? "09:00"}`}
            </Text>
          </Group>
          {shop.reviews != null && (
            <Text fz="xs" c="dimmed">
              {roCount(shop.reviews, "recenzie", "recenzii")}
            </Text>
          )}
        </Group>
      </Stack>
    </Card>
    </Link>
  );
}
