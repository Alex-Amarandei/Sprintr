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
import { Clock, MapPin, Phone, Star, Truck } from "lucide-react";
import { ScrollToHash } from "@/components/ui/ScrollToHash";
import { getShopView, getShopCatalog } from "@/lib/catalog/shops";
import { getShopReviews } from "@/lib/reviews/queries";
import { getActiveOffers } from "@/lib/offers/queries";
import { SHOP_CATEGORY } from "@/components/shop/category";
import { ShopReviews } from "@/components/shop/ShopReviews";
import { ShopOffers } from "@/components/shop/ShopOffers";
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

  const [shop, catalog, reviews, offers] = await Promise.all([
    getShopView(shopId),
    getShopCatalog(shopId),
    getShopReviews(shopId),
    getActiveOffers(shopId),
  ]);
  if (!shop) notFound();
  const { items, categories } = catalog;
  const cat = SHOP_CATEGORY[shop.category ?? "print"];
  const Icon = cat.icon;

  // Real weekly hours from the DB (`shops.schedule`); fall back to a sample only for
  // shops that haven't set any. `isOpen` (override-aware) drives the open/closed gate.
  const schedule = shop.schedule ?? SAMPLE_SCHEDULE;
  const overrides = shop.scheduleOverrides ?? {};
  const open = shop.isOpen ?? getScheduleStatus(schedule, overrides).open;

  return (
    <Stack gap="lg">
      <ScrollToHash />
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
                  <Truck size={15} />
                  <Text fz="sm">
                    {shop.deliveryFee && shop.deliveryFee > 0
                      ? `Livrare ${shop.deliveryFee.toFixed(2)} lei`
                      : "Livrare gratuită"}
                  </Text>
                </Group>
                {shop.address && (
                  <Anchor
                    // Opens the address in Google Maps (new tab). Ember + hover underline so it
                    // clearly reads as clickable against the dimmed meta row.
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    c="brand.6"
                    fw={500}
                    underline="hover"
                  >
                    <Group gap={4} wrap="nowrap">
                      <MapPin size={15} />
                      <Text fz="sm">{shop.address}</Text>
                    </Group>
                  </Anchor>
                )}
                {shop.phone && (
                  <Anchor
                    // Native dial (tel:). Same ember link treatment as the address.
                    href={`tel:${shop.phone.replace(/\s+/g, "")}`}
                    c="brand.6"
                    fw={500}
                    underline="hover"
                  >
                    <Group gap={4} wrap="nowrap">
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

      {/* Live automatic promotions for this shop (hidden when there are none). */}
      <ShopOffers offers={offers} />

      {/* Program — full width */}
      <Box mx="md">
        <ShopSchedule schedule={schedule} overrides={overrides} />
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
          shopDeliveryFee={shop.deliveryFee ?? 0}
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
