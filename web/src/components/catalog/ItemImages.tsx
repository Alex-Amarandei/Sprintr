"use client";

import { useRef, useState } from "react";
import { ActionIcon, Badge, Box, Group, Image, Stack, Text, Tooltip } from "@mantine/core";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MAX_IMAGES } from "@/lib/catalog/schema";
import { IMAGE_PLACEHOLDER, MAX_IMAGE_MB, isLocalImage, itemImageUrl } from "@/lib/catalog/images";
import { ImageLightbox } from "./ImageLightbox";

const SIZE = 84;

/** One thumbnail: click to enlarge; actions reveal subtly on hover. */
function Thumb({
  path,
  isMain,
  pending,
  onZoom,
  onMakeMain,
  onRemove,
}: {
  path: string;
  isMain: boolean;
  pending: boolean;
  onZoom: () => void;
  onMakeMain: () => void;
  onRemove: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <Box
      pos="relative"
      w={SIZE}
      h={SIZE}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Image
        src={itemImageUrl(path) ?? undefined}
        w={SIZE}
        h={SIZE}
        radius="md"
        fit="cover"
        fallbackSrc={IMAGE_PLACEHOLDER}
        onClick={onZoom}
        style={{
          cursor: "zoom-in",
          display: "block",
          border: isMain
            ? "2px solid var(--mantine-color-brand-6)"
            : "1px solid var(--mantine-color-default-border)",
        }}
      />

      {isMain && (
        <Badge size="xs" color="brand" pos="absolute" bottom={3} left={3} style={{ pointerEvents: "none" }}>
          Principală
        </Badge>
      )}
      {pending && !isMain && (
        <Badge size="xs" variant="light" color="yellow" pos="absolute" bottom={3} left={3} style={{ pointerEvents: "none" }}>
          nou
        </Badge>
      )}

      {/* Hover actions — quiet until you hover, then a soft translucent pill. */}
      <Group
        gap={2}
        pos="absolute"
        top={4}
        right={4}
        wrap="nowrap"
        style={{
          opacity: hover ? 1 : 0,
          transition: "opacity 120ms ease",
          background: "rgba(0, 0, 0, 0.45)",
          borderRadius: "var(--mantine-radius-sm)",
          padding: 2,
        }}
      >
        {!isMain && (
          <Tooltip label="Setează principală" withinPortal>
            <ActionIcon size="sm" variant="transparent" c="white" onClick={onMakeMain} aria-label="Setează principală">
              <Star size={14} />
            </ActionIcon>
          </Tooltip>
        )}
        <Tooltip label="Șterge" withinPortal>
          <ActionIcon size="sm" variant="transparent" c="white" onClick={onRemove} aria-label="Șterge imaginea">
            <Trash2 size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Box>
  );
}

/**
 * Image manager for a catalog item (product or service). Picking files creates LOCAL
 * previews only (blob: URLs) — they show immediately but are NOT uploaded until the
 * catalog is saved. Click any thumbnail to view it full-size (same viewer the customer
 * gets). The first image is the main one; "make main" reorders it to the front.
 */
export function ItemImages({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState<number | null>(null);

  function onFiles(files: FileList | null) {
    if (!files?.length) return;
    if (inputRef.current) inputRef.current.value = "";

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`Poți adăuga maxim ${MAX_IMAGES} imagini per produs.`);
      return;
    }

    const picked = Array.from(files);
    const withinSize = picked.filter((f) => f.size <= MAX_IMAGE_MB * 1024 * 1024);
    const tooBig = picked.length - withinSize.length;
    const accepted = withinSize.slice(0, remaining);
    const overCount = withinSize.length - accepted.length;

    if (tooBig > 0) toast.error(`${tooBig} ${tooBig === 1 ? "imagine depășește" : "imagini depășesc"} ${MAX_IMAGE_MB} MB și ${tooBig === 1 ? "a fost ignorată" : "au fost ignorate"}.`);
    if (overCount > 0) toast.error(`Maxim ${MAX_IMAGES} imagini — ${overCount} nu ${overCount === 1 ? "a fost adăugată" : "au fost adăugate"}.`);
    if (!accepted.length) return;

    // Local previews only — no upload here. Stored on save.
    const previews = accepted.map((f) => URL.createObjectURL(f));
    onChange([...images, ...previews]);
  }

  const makeMain = (i: number) => onChange([images[i], ...images.filter((_, k) => k !== i)]);
  const remove = (i: number) => onChange(images.filter((_, k) => k !== i));

  return (
    <Stack gap={6}>
      <Text fz="sm" fw={500}>
        Imagini
      </Text>
      <Group gap="sm" wrap="wrap">
        {images.map((path, i) => (
          <Thumb
            key={`${path}-${i}`}
            path={path}
            isMain={i === 0}
            pending={isLocalImage(path)}
            onZoom={() => setZoom(i)}
            onMakeMain={() => makeMain(i)}
            onRemove={() => remove(i)}
          />
        ))}

        {images.length < MAX_IMAGES && (
          <Tooltip label="Adaugă imagini" withinPortal>
            <ActionIcon
              variant="default"
              w={SIZE}
              h={SIZE}
              radius="md"
              onClick={() => inputRef.current?.click()}
              aria-label="Adaugă imagini"
            >
              <ImagePlus size={20} />
            </ActionIcon>
          </Tooltip>
        )}
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.currentTarget.files)} />
      </Group>
      <Text fz="xs" c="dimmed">
        Maxim {MAX_IMAGES} imagini, {MAX_IMAGE_MB} MB fiecare. Prima este cea principală —
        apasă pe o imagine pentru previzualizare. Se încarcă la salvarea catalogului.
      </Text>

      <ImageLightbox
        images={images}
        index={zoom ?? 0}
        opened={zoom !== null}
        onIndexChange={setZoom}
        onClose={() => setZoom(null)}
      />
    </Stack>
  );
}
