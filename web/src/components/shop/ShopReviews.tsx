import { Badge, Group, Paper, Rating, Stack, Text, Title } from "@mantine/core";
import { Star } from "lucide-react";
import type { ShopReview } from "@/lib/reviews/queries";
import { EmptyState } from "@/components/ui/EmptyState";
import { roCount } from "@/lib/utils/format";

/** Store reviews section: aggregate header + list of verified-purchase reviews. */
export function ShopReviews({
  reviews,
  rating,
  count,
}: {
  reviews: ShopReview[];
  rating?: number;
  count?: number;
}) {
  return (
    <div>
      <Group justify="space-between" align="center" mb="md">
        <Title order={3}>Recenzii</Title>
        {count ? (
          <Group gap="xs" align="center">
            <Star
              size={18}
              fill="var(--mantine-color-brand-6)"
              color="var(--mantine-color-brand-6)"
            />
            <Text fw={800} fz="lg" lh={1}>
              {rating?.toFixed(1)}
            </Text>
            <Text fz="sm" c="dimmed">
              ({roCount(count, "recenzie", "recenzii")})
            </Text>
          </Group>
        ) : null}
      </Group>

      {reviews.length === 0 ? (
        <EmptyState
          icon={<Star size={26} />}
          title="Încă nu există recenzii"
          description="Fii primul care lasă o recenzie după ce primești o comandă de la acest magazin."
        />
      ) : (
        <Stack gap="md">
          {reviews.map((r) => (
            <Paper key={r.id} withBorder radius="lg" p="md">
              <Group justify="space-between" align="center" mb={r.comment ? 6 : 0}>
                <Group gap="sm" align="center">
                  <Rating value={r.rating} readOnly size="sm" color="brand" />
                  <Badge variant="light" color="stone" size="sm">
                    {r.isOwn ? "Recenzia ta" : "Client verificat"}
                  </Badge>
                </Group>
                <Text fz="xs" c="dimmed">
                  {r.createdAt}
                </Text>
              </Group>
              {r.comment && (
                <Text fz="sm" c="var(--mantine-color-text)">
                  {r.comment}
                </Text>
              )}
              {r.reply && (
                <Paper
                  mt="sm"
                  radius="md"
                  p="sm"
                  bg="var(--mantine-color-default-hover)"
                  withBorder
                >
                  <Text fz="xs" fw={700} c="brand.7">
                    Răspunsul magazinului · {r.reply.createdAt}
                  </Text>
                  <Text fz="sm" mt={2}>
                    {r.reply.body}
                  </Text>
                </Paper>
              )}
            </Paper>
          ))}
        </Stack>
      )}
    </div>
  );
}
