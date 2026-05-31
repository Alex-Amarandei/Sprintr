"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Group,
  Rating,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

/**
 * Post-purchase store review. Shown on a customer's `done` order. Inserts directly
 * into `reviews` (RLS verifies the done-order + author); one shop review per customer.
 */
export function ReviewForm({
  shopId,
  orderId,
  currentUserId,
  existing,
}: {
  shopId: string;
  orderId: string;
  currentUserId: string;
  existing: { rating: number; comment: string | null } | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  // Already reviewed → thank-you state (reviews are immutable).
  if (existing) {
    return (
      <Card>
        <Text fw={700} mb="xs">
          Recenzia ta
        </Text>
        <Group gap="sm" align="center">
          <Rating value={existing.rating} readOnly color="brand" />
          <Text fz="sm" c="dimmed">
            Mulțumim pentru feedback!
          </Text>
        </Group>
        {existing.comment && (
          <Text fz="sm" mt="xs">
            {existing.comment}
          </Text>
        )}
      </Card>
    );
  }

  async function submit() {
    if (rating < 1) {
      toast.error("Alege un rating de la 1 la 5 stele");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("reviews").insert({
      author_id: currentUserId,
      shop_id: shopId,
      order_id: orderId,
      target_type: "shop",
      target_id: shopId,
      rating,
      comment: comment.trim() || null,
    });
    setSaving(false);

    if (error) {
      toast.error(
        error.code === "23505"
          ? "Ai lăsat deja o recenzie acestui magazin."
          : "Recenzia nu a putut fi salvată. Încearcă din nou."
      );
      return;
    }
    toast.success("Mulțumim! Recenzia ta a fost publicată.");
    router.refresh();
  }

  return (
    <Card>
      <Group gap="xs" mb="xs">
        <Star size={18} />
        <Text fw={700}>Cum a fost comanda?</Text>
      </Group>
      <Text fz="sm" c="dimmed" mb="md">
        Lasă o recenzie magazinului — ajuți alți clienți să aleagă.
      </Text>
      <Stack gap="md">
        <Rating value={rating} onChange={setRating} size="lg" color="brand" />
        <Textarea
          placeholder="Spune-ne cum a decurs (opțional)…"
          autosize
          minRows={2}
          value={comment}
          onChange={(e) => setComment(e.currentTarget.value)}
        />
        <Button onClick={submit} loading={saving} disabled={rating < 1}>
          Publică recenzia
        </Button>
      </Stack>
    </Card>
  );
}
