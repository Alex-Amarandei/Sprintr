import { ThemeIcon, type ThemeIconProps } from "@mantine/core";

/**
 * Tinted icon box that keeps its LIGHT-mode look in both color schemes
 * (pale `<color>-1` background + `<color>-7` icon) — so dark mode doesn't dull it.
 * Drop-in replacement for `<ThemeIcon variant="light" color="…">`.
 */
export function TintIcon({ color = "brand", style, ...rest }: ThemeIconProps) {
  const c = String(color);
  return (
    <ThemeIcon
      color={color}
      style={[
        {
          backgroundColor: `var(--mantine-color-${c}-1)`,
          color: `var(--mantine-color-${c}-7)`,
        },
        style,
      ]}
      {...rest}
    />
  );
}
