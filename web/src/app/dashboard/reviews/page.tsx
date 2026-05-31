import { Metadata } from "next";
import { Stack, Text, Title } from "@mantine/core";
import { Star } from "lucide-react";
import { getMyShop } from "@/lib/orders/queries";
import { getShopReviewsForDashboard } from "@/lib/reviews/queries";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReviewsManager } from "@/components/dashboard/ReviewsManager";
import { roCount } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Recenzii" };

export default async function ReviewsPage() {
  const [shop, reviews] = await Promise.all([getMyShop(), getShopReviewsForDashboard()]);

  if (!shop) {
    return (
      <Stack gap="lg">
        <Title order={2}>Recenzii</Title>
        <EmptyState
          icon={<Star size={26} />}
          title="Niciun magazin asociat"
          description="Contul tău nu este asociat unui magazin."
        />
      </Stack>
    );
  }

  const avg = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;
  const unreplied = reviews.filter((r) => !r.reply).length;

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Recenzii</Title>
        <Text c="dimmed">
          {reviews.length
            ? `${avg} ★ în medie · ${roCount(reviews.length, "recenzie", "recenzii")} · ${unreplied} fără răspuns`
            : "Recenziile clienților verificați apar aici."}
        </Text>
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          icon={<Star size={26} />}
          title="Nicio recenzie încă"
          description="După prima comandă finalizată, clienții îți pot lăsa o recenzie."
        />
      ) : (
        <ReviewsManager reviews={reviews} />
      )}
    </Stack>
  );
}
