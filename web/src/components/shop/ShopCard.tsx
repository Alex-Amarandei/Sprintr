import Link from "next/link";
import { Avatar, Badge, Box, Card, Group, Stack, Text } from "@mantine/core";
import { Clock, Star } from "lucide-react";
import type { SampleShop } from "@/lib/catalog/samples";
import { OpenBadge } from "@/components/ui/OpenBadge";
import { getScheduleStatus } from "@/lib/shop/schedule";
import { roCount } from "@/lib/utils/format";
import { SHOP_CATEGORY } from "./category";

export function ShopCard({ shop }: { shop: SampleShop }) {
  const cat = SHOP_CATEGORY[shop.category ?? "print"];
  const Icon = cat.icon;
  // Real open/closed + label from the weekly schedule honouring date overrides (pause).
  const status = shop.schedule
    ? getScheduleStatus(shop.schedule, shop.scheduleOverrides ?? {})
    : null;
  const open = status ? status.open : shop.isOpen ?? true;
  const banner = shop.bannerUrl ?? null;
  const logo = shop.logoUrl ?? null;

  return (
    <Link
      href={`/shop/${shop.id}`}
      style={{ textDecoration: "none", display: "block", height: "100%" }}
    >
    <Card
      p={0}
      withBorder
      className="catalog-card"
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
          background: banner ? "var(--mantine-color-dark-6)" : cat.gradient,
          backgroundImage: banner ? `url(${banner})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
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
        {!banner && (
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
        )}
      </Box>

      {/* Body */}
      <Stack gap="xs" p="md" justify="space-between" style={{ flex: 1 }}>
        <Group gap="sm" wrap="nowrap" align="flex-start">
          {logo && (
            <Avatar src={logo} size={38} radius="md" style={{ flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0 }}>
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
        </Group>

        <Group justify="space-between" mt="xs" wrap="nowrap">
          <Group gap={4} c={open ? "dimmed" : "red.7"} wrap="nowrap" style={{ minWidth: 0 }}>
            <Clock size={14} style={{ flexShrink: 0 }} />
            <Text fz="xs" fw={open ? 400 : 600} truncate>
              {status ? status.short : open ? shop.eta ?? "—" : "Închis"}
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
