import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ActionIcon,
  Box,
  Card,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  Clock,
  Heart,
  MapPin,
  Phone,
  Share2,
  Star,
  Upload,
} from "lucide-react";
import { getShopView, getShopCatalog } from "@/lib/catalog/shops";
import { SHOP_CATEGORY } from "@/components/shop/category";
import { OpenBadge } from "@/components/ui/OpenBadge";
import { ShopCatalogTabs } from "@/components/shop/ShopCatalogTabs";
import { ShopSchedule } from "@/components/shop/ShopSchedule";
import { SAMPLE_SCHEDULE, getScheduleStatus } from "@/lib/shop/schedule";

export const metadata: Metadata = { title: "Magazin" };

interface Props {
  params: Promise<{ shopId: string }>;
}

export default async function ShopDetailPage({ params }: Props) {
  const { shopId } = await params;

  const [shop, items] = await Promise.all([
    getShopView(shopId),
    getShopCatalog(shopId),
  ]);
  if (!shop) notFound();
  const cat = SHOP_CATEGORY[shop.category ?? "print"];
  const Icon = cat.icon;

  // TODO(BE): pass the shop's real `schedule` jsonb instead of SAMPLE_SCHEDULE.
  const open = getScheduleStatus(SAMPLE_SCHEDULE).open;

  return (
    <Stack gap="lg">
      {/* Banner */}
      <Box
        h={180}
        style={{
          borderRadius: "var(--mantine-radius-lg)",
          background: `radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1px) 0 0 / 18px 18px, ${cat.gradient}`,
        }}
      />

      {/* Header card (overlaps banner) */}
      <Card mt={-72} mx="md" style={{ position: "relative" }}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group align="flex-start" wrap="nowrap" gap="md">
            <ThemeIcon
              size={72}
              radius="lg"
              variant="filled"
              style={{ background: cat.gradient }}
            >
              <Icon size={34} color="white" strokeWidth={1.75} />
            </ThemeIcon>
            <div>
              <Group gap="sm" align="center">
                <Title order={2}>{shop.name}</Title>
                <OpenBadge open={open} label={open ? "Deschis acum" : undefined} />
              </Group>
              <Text c="dimmed" mt={4} maw={560}>
                {shop.description}
              </Text>
              <Group gap="lg" mt="sm" c="dimmed">
                {shop.rating != null && (
                  <Group gap={4}>
                    <Star size={15} fill="var(--mantine-color-brand-6)" color="var(--mantine-color-brand-6)" />
                    <Text fz="sm" fw={600} c="ink.9">
                      {shop.rating.toFixed(1)}
                    </Text>
                    {shop.reviews != null && (
                      <Text fz="sm">({shop.reviews} recenzii)</Text>
                    )}
                  </Group>
                )}
                {shop.eta && (
                  <Group gap={4}>
                    <Clock size={15} />
                    <Text fz="sm">{shop.eta} livrare</Text>
                  </Group>
                )}
                <Group gap={4}>
                  <MapPin size={15} />
                  <Text fz="sm">{shop.address}</Text>
                </Group>
                {shop.phone && (
                  <Group gap={4}>
                    <Phone size={15} />
                    <Text fz="sm">{shop.phone}</Text>
                  </Group>
                )}
              </Group>
            </div>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <ActionIcon variant="default" size="lg" aria-label="Favorite">
              <Heart size={18} />
            </ActionIcon>
            <ActionIcon variant="default" size="lg" aria-label="Distribuie">
              <Share2 size={18} />
            </ActionIcon>
          </Group>
        </Group>
      </Card>

      <Group align="flex-start" gap="lg" wrap="nowrap" mx="md">
        {/* Main: program + catalog */}
        <Stack gap="lg" style={{ flex: 1, minWidth: 0 }}>
          {/* Program */}
          {/* TODO(BE): pass the shop's real `schedule` jsonb instead of SAMPLE_SCHEDULE. */}
          <ShopSchedule schedule={SAMPLE_SCHEDULE} />

          {/* Catalog */}
          <div>
            <Title order={3} mb="xs">
              Catalog
            </Title>
            <ShopCatalogTabs items={items} shopId={shopId} />
          </div>
        </Stack>

        {/* Sidebar: active promo (visual; offers wiring TODO) */}
        <Box w={300} visibleFrom="md" style={{ flexShrink: 0 }}>
          <Card>
            <Text tt="uppercase" fz="xs" fw={700} c="brand.6" style={{ letterSpacing: 0.6 }}>
              Promoție activă
            </Text>
            <Text fw={700} fz="lg" mt="xs">
              10% reducere licență
            </Text>
            <Text c="dimmed" fz="sm" mt={4}>
              Aplică automat cu codul{" "}
              <Text span fw={700} c="ink.9">
                STUDENT10
              </Text>{" "}
              la coș.
            </Text>
          </Card>
        </Box>
      </Group>
    </Stack>
  );
}
