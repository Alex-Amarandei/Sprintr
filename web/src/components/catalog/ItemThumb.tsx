import { Box, Image } from "@mantine/core";
import { Image as ImageIcon } from "lucide-react";
import { IMAGE_PLACEHOLDER } from "@/lib/catalog/images";

/**
 * Item thumbnail for the catalog editor cards. Shows the photo when there is one;
 * otherwise a neutral icon placeholder (instead of an empty grey square).
 */
export function ItemThumb({
  src,
  size = 56,
  radius = "md",
}: {
  src?: string | null;
  size?: number;
  radius?: string;
}) {
  const border = "1px solid var(--mantine-color-default-border)";

  if (!src) {
    return (
      <Box
        w={size}
        h={size}
        style={{
          flexShrink: 0,
          border,
          borderRadius: `var(--mantine-radius-${radius})`,
          background: "var(--mantine-color-default)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--mantine-color-dimmed)",
        }}
      >
        <ImageIcon size={Math.round(size * 0.42)} strokeWidth={1.75} />
      </Box>
    );
  }

  return (
    <Image
      src={src}
      w={size}
      h={size}
      radius={radius}
      fit="cover"
      fallbackSrc={IMAGE_PLACEHOLDER}
      style={{ flexShrink: 0, border }}
    />
  );
}
