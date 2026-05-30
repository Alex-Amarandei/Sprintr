import { Box, type MantineColor } from "@mantine/core";

/** Small status dot used inside pills/badges and online indicators. */
export function Dot({
  color = "brand",
  size = 6,
  solid = false,
}: {
  color?: MantineColor;
  size?: number;
  /** Render a white dot — for use on solid/filled coloured backgrounds. */
  solid?: boolean;
}) {
  return (
    <Box
      w={size}
      h={size}
      bg={solid ? "white" : `${color}.6`}
      style={{ borderRadius: 9999, flexShrink: 0 }}
    />
  );
}
