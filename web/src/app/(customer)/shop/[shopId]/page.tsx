import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Anchor,
  Avatar,
  Box,
  Card,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { Clock, MapPin, Phone, Star } from "lucide-react";
import { getShopView, getShopCatalog } from "@/lib/catalog/shops";
import { getShopReviews } from "@/lib/reviews/queries";
import { SHOP_CATEGORY } from "@/components/shop/category";
import { ShopReviews } from "@/components/shop/ShopReviews";
import { OpenBadge } from "@/components/ui/OpenBadge";
import { ShopCatalogTabs } from "@/components/shop/ShopCatalogTabs";
import { ShopSchedule } from "@/components/shop/ShopSchedule";
import { SAMPLE_SCHEDULE, getScheduleStatus } from "@/lib/shop/schedule";
import { roCount } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Magazin" };

interface Props {
  params: Promise<{ shopId: string }>;
}

export default async function ShopDetailPage({ params }: Props) {
  const { shopId } = await params;

  const [shop, catalog, reviews] = await Promise.all([
    getShopView(shopId),
    getShopCatalog(shopId),
    getShopReviews(shopId),
  ]);
  if (!shop) notFound();
  const { items, categories } = catalog;
  const cat = SHOP_CATEGORY[shop.category ?? "print"];
  const Icon = cat.icon;

  // Real weekly hours from the DB (`shops.schedule`); fall back to a sample only for
  // shops that haven't set any. `isOpen` (override-aware) drives the open/closed gate.
  const schedule = shop.schedule ?? SAMPLE_SCHEDULE;
  const open = shop.isOpen ?? getScheduleStatus(schedule).open;

  return (
    <Stack gap="lg">
      {/* Banner */}
      <Box
        h={180}
        style={{
          borderRadius: "var(--mantine-radius-lg)",
          background: shop.bannerUrl
            ? undefined
            : `radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1px) 0 0 / 18px 18px, ${cat.gradient}`,
          backgroundColor: shop.bannerUrl ? "var(--mantine-color-dark-6)" : undefined,
          backgroundImage: shop.bannerUrl ? `url(${shop.bannerUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Header card (overlaps banner) */}
      <Card mt={-72} mx="md" style={{ position: "relative", padding: "8px" }}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group align="flex-start" wrap="nowrap" gap="md">
            {shop.logoUrl ? (
              <Avatar
                src={shop.logoUrl}
                size={72}
                radius="lg"
                style={{ border: "3px solid var(--mantine-color-body)" }}
              />
            ) : (
              <ThemeIcon
                size={72}
                radius="lg"
                variant="filled"
                style={{ background: cat.gradient }}
              >
                <Icon size={34} color="white" strokeWidth={1.75} />
              </ThemeIcon>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Group gap="sm" align="center">
                <Title order={2}>{shop.name}</Title>
                <OpenBadge open={open} label={open ? "Deschis acum" : undefined} />
              </Group>
              <Text c="dimmed" mt={4}>
                {shop.description}
              </Text>
              <Group gap="lg" mt="sm" c="dimmed">
                {shop.rating != null && (
                  <Group gap={4}>
                    <Star size={15} fill="var(--mantine-color-brand-6)" color="var(--mantine-color-brand-6)" />
                    <Text fz="sm" fw={600} c="var(--mantine-color-text)">
                      {shop.rating.toFixed(1)}
                    </Text>
                    {shop.reviews != null && (
                      <Text fz="sm">({roCount(shop.reviews, "recenzie", "recenzii")})</Text>
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
                  <Anchor
                    href={`tel:${shop.phone.replace(/\s+/g, "")}`}
                    c="dimmed"
                    underline="hover"
                  >
                    <Group gap={4}>
                      <Phone size={15} />
                      <Text fz="sm">{shop.phone}</Text>
                    </Group>
                  </Anchor>
                )}
              </Group>
            </div>
          </Group>
        </Group>
      </Card>

      {/* Active promo (visual; offers wiring TODO) — full width */}
      <Card mx="md">
        <Text tt="uppercase" fz="xs" fw={700} c="brand.6" style={{ letterSpacing: 0.6 }}>
          Promoție activă
        </Text>
        <Text fw={700} fz="lg" mt="xs">
          10% reducere licență
        </Text>
        <Text c="dimmed" fz="sm" mt={4}>
          Aplică automat cu codul{" "}
          <Text span fw={700} c="var(--mantine-color-text)">
            STUDENT10
          </Text>{" "}
          la coș.
        </Text>
      </Card>

      {/* Program — full width */}
      <Box mx="md">
        <ShopSchedule schedule={schedule} />
      </Box>

      {/* Catalog (full width) */}
      <Box mx="md">
        <Title order={3} mb="xs">
          Catalog
        </Title>
        <ShopCatalogTabs
          items={items}
          categories={categories}
          shopId={shopId}
          shopName={shop.name}
          shopOpen={open}
        />
      </Box>

      {/* Reviews (full width) */}
      <Box mx="md">
        <ShopReviews
          reviews={reviews}
          rating={shop.rating}
          count={shop.reviews}
        />
      </Box>
    </Stack>
  );
}
