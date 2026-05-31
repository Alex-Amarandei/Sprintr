"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Group, Rating, Stack, Text, Textarea } from "@mantine/core";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { replyToReview } from "@/lib/reviews/actions";
import type { DashboardReview } from "@/lib/reviews/queries";

const TARGET_COLOR: Record<DashboardReview["targetType"], string> = {
  shop: "brand",
  employee: "grape",
  item: "blue",
};

function ReviewRow({ review }: { review: DashboardReview }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function send() {
    setPending(true);
    const res = await replyToReview(review.id, body);
    setPending(false);
    if (res.ok) {
      toast.success("Răspuns publicat");
      setBody("");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(res.error ?? "Nu am putut publica răspunsul");
    }
  }

  return (
    <Card withBorder radius="lg">
      <Group gap="xs" align="center">
        <Rating value={review.rating} readOnly size="sm" />
        <Badge variant="light" size="sm" color={TARGET_COLOR[review.targetType]}>
          {review.targetLabel}
        </Badge>
      </Group>
      <Text fz="sm" c="dimmed" mt={4}>
        {review.authorName} · {review.createdAt}
      </Text>
      {review.comment && <Text mt="xs">{review.comment}</Text>}

      {review.reply ? (
        <Card mt="md" radius="md" p="sm" bg="var(--mantine-color-default-hover)">
          <Text fz="xs" fw={700} c="brand.7">
            Răspunsul magazinului · {review.reply.createdAt}
          </Text>
          <Text fz="sm" mt={2}>
            {review.reply.body}
          </Text>
        </Card>
      ) : open ? (
        <Stack gap="xs" mt="md">
          <Textarea
            autosize
            minRows={2}
            placeholder="Scrie un răspuns public…"
            value={body}
            onChange={(e) => setBody(e.currentTarget.value)}
          />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" size="xs" onClick={() => setOpen(false)}>
              Anulează
            </Button>
            <Button size="xs" loading={pending} disabled={!body.trim()} onClick={send}>
              Publică răspunsul
            </Button>
          </Group>
        </Stack>
      ) : (
        <Button
          mt="md"
          variant="light"
          size="xs"
          leftSection={<MessageSquare size={14} />}
          onClick={() => setOpen(true)}
        >
          Răspunde
        </Button>
      )}
    </Card>
  );
}

export function ReviewsManager({ reviews }: { reviews: DashboardReview[] }) {
  return (
    <Stack gap="md">
      {reviews.map((r) => (
        <ReviewRow key={r.id} review={r} />
      ))}
    </Stack>
  );
}
