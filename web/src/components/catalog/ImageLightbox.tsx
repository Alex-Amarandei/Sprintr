"use client";

import { useEffect } from "react";
import { ActionIcon, Box, Group, Image, Modal } from "@mantine/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IMAGE_PLACEHOLDER, itemImageUrl } from "@/lib/catalog/images";

/**
 * Full-size image viewer used by both the builder (so the shop can verify how an image
 * looks) and the customer card (the client sees it the same way). Supports keyboard
 * arrows, prev/next, and a thumbnail strip when there are multiple images.
 */
export function ImageLightbox({
  images,
  index,
  onIndexChange,
  opened,
  onClose,
}: {
  images: string[];
  index: number;
  onIndexChange: (i: number) => void;
  opened: boolean;
  onClose: () => void;
}) {
  const count = images.length;

  useEffect(() => {
    if (!opened || count < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + count) % count);
      else if (e.key === "ArrowRight") onIndexChange((index + 1) % count);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opened, index, count, onIndexChange]);

  if (!count) return null;
  const safe = Math.min(Math.max(index, 0), count - 1);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="xl"
      padding="md"
      title={count > 1 ? `Imagine ${safe + 1} din ${count}` : "Imagine"}
      styles={{ title: { fontWeight: 600 } }}
    >
      <Box pos="relative">
        <Image
          src={itemImageUrl(images[safe]) ?? undefined}
          alt=""
          fit="contain"
          mah="72vh"
          radius="md"
          fallbackSrc={IMAGE_PLACEHOLDER}
          style={{ background: "var(--mantine-color-default-hover)" }}
        />
        {count > 1 && (
          <>
            <ActionIcon
              variant="default"
              radius="xl"
              size="lg"
              aria-label="Imaginea anterioară"
              pos="absolute"
              left={8}
              top="50%"
              style={{ transform: "translateY(-50%)" }}
              onClick={() => onIndexChange((safe - 1 + count) % count)}
            >
              <ChevronLeft size={20} />
            </ActionIcon>
            <ActionIcon
              variant="default"
              radius="xl"
              size="lg"
              aria-label="Imaginea următoare"
              pos="absolute"
              right={8}
              top="50%"
              style={{ transform: "translateY(-50%)" }}
              onClick={() => onIndexChange((safe + 1) % count)}
            >
              <ChevronRight size={20} />
            </ActionIcon>
          </>
        )}
      </Box>

      {count > 1 && (
        <Group gap="xs" mt="sm" justify="center" wrap="wrap">
          {images.map((p, i) => (
            <Image
              key={`${p}-${i}`}
              src={itemImageUrl(p) ?? undefined}
              w={52}
              h={52}
              radius="sm"
              fit="cover"
              fallbackSrc={IMAGE_PLACEHOLDER}
              onClick={() => onIndexChange(i)}
              style={{
                cursor: "pointer",
                border:
                  i === safe
                    ? "2px solid var(--mantine-color-brand-6)"
                    : "1px solid var(--mantine-color-default-border)",
              }}
            />
          ))}
        </Group>
      )}
    </Modal>
  );
}
