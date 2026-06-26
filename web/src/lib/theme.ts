import { createTheme, type MantineColorsTuple } from "@mantine/core";

/**
 * Sprintr design system v2 — "Slate · Ink · Ember".
 * Cool-blue structure (slate/ink/mist/stone) + vibrant ember for CTAs & status,
 * teal/cyan accents. Ramps are 10-shade Mantine tuples (0 = lightest, 9 = darkest);
 * derived from the prototype's 7-shade anchors. Use shades by index, e.g. `c="slate.6"`.
 */

// Brand = Ember. Vibrant base sits at index 6 so filled Buttons/Badges render the CTA orange.
const brand: MantineColorsTuple = [
  "#fdf4ed", "#fae0cf", "#f5c6a7", "#f1a97b", "#ec8f53",
  "#e97e39", "#e77023", "#b05319", "#7a3810", "#451c07",
];

// Slate — primary structural blue (headings, dark surfaces, gradients).
const slate: MantineColorsTuple = [
  "#eaf2f8", "#c9deef", "#a4c8e2", "#7cb0d1", "#6996b2",
  "#577d95", "#456478", "#344d5d", "#243743", "#15222a",
];

// Ink — darkest charcoal-blue (dark bands, "Dark"/"Acceptă" buttons, deepest text).
const ink: MantineColorsTuple = [
  "#e5eef6", "#bcd5e9", "#98bcd7", "#77a3c2", "#648aa4",
  "#527187", "#3f596b", "#2e4250", "#1e2d37", "#0f181f",
];

// Teal — success / "Deschis" / "Acceptată" / online (filled base at idx 6).
const teal: MantineColorsTuple = [
  "#80f3fd", "#4cd9e4", "#2ebec8", "#26a3ab", "#1e8890",
  "#166e75", "#0f555a", "#093e41", "#04282a", "#011415",
];

// Cyan — "În pregătire". Saturated turquoise (not pale blue) per design review.
const cyan: MantineColorsTuple = [
  "#e7feff", "#b8f6fd", "#7eecf7", "#3ddcec", "#12c4d8",
  "#06a5bd", "#0a8497", "#0c6675", "#0a4954", "#072e35",
];

// Mist — muted blue-grey neutrals (secondary text, borders, muted pills).
const mist: MantineColorsTuple = [
  "#e6ecf1", "#c2d3df", "#a3b9c9", "#88a0b0", "#738795",
  "#5e6e7a", "#495760", "#364048", "#232b31", "#12171b",
];

// Stone — pure neutral grey (app backgrounds, dividers, subtle surfaces).
const stone: MantineColorsTuple = [
  "#f0f1f1", "#dadbdc", "#c1c3c6", "#a6a9ae", "#8d9095",
  "#75787c", "#5e6063", "#48494c", "#333436", "#1f2021",
];

export const theme = createTheme({
  primaryColor: "brand",
  primaryShade: 6,
  autoContrast: true, // readable text on filled brand/teal/ink surfaces
  colors: { brand, slate, ink, teal, cyan, mist, stone },

  // Radius scale — tightened for crisper, less-rounded corners:
  // input/button 6 (md) · card 8 (lg) · banner 12 (xl).
  defaultRadius: "md",
  radius: { xs: "3px", sm: "4px", md: "6px", lg: "8px", xl: "12px" },

  // Spacing rhythm from the prototype: 4 · 8 · 12 · 16 · 24 · 32 · 48.
  spacing: { xs: "8px", sm: "12px", md: "16px", lg: "24px", xl: "32px" },

  // Nudge `xs` up from Mantine's 12px → 13px (12px reads a touch small for body copy).
  fontSizes: { xs: "0.8125rem" },

  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  fontFamilyMonospace:
    "var(--font-geist-mono), 'JetBrains Mono', ui-monospace, monospace",
  headings: {
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    fontWeight: "800",
    // Slightly tighter than Mantine defaults — page/section titles read big otherwise.
    sizes: {
      h1: { fontSize: "1.75rem", lineHeight: "1.2" },
      h2: { fontSize: "1.375rem", lineHeight: "1.25" },
      h3: { fontSize: "1.1875rem", lineHeight: "1.3" },
      h4: { fontSize: "1.0625rem", lineHeight: "1.35" },
    },
  },

  // Component defaults — the prototype look without any custom CSS.
  // Plain config objects (not Component.extend) so this stays a server-safe
  // module: Component.extend is just a TS helper and importing Mantine's client
  // components here would break under the App Router.
  components: {
    Button: { defaultProps: { radius: "md" } },
    ActionIcon: { defaultProps: { radius: "md" } },
    Title: { defaultProps: { c: "var(--mantine-color-text)" } },
    Card: { defaultProps: { radius: "lg", padding: "lg", withBorder: true } },
    Paper: { defaultProps: { radius: "lg" } },
    Badge: {
      defaultProps: { radius: "sm", fw: 600 },
      styles: { label: { textTransform: "none" } },
    },
    // Mid-bold tab labels (semibold) — stronger than body, lighter than titles.
    Tabs: { styles: { tabLabel: { fontWeight: 600 } } },
    Modal: { defaultProps: { radius: "lg", centered: true } },
    TextInput: { defaultProps: { radius: "md" } },
    Textarea: { defaultProps: { radius: "md" } },
    NumberInput: { defaultProps: { radius: "md" } },
    PasswordInput: { defaultProps: { radius: "md" } },
    Select: { defaultProps: { radius: "md" } },
    MultiSelect: { defaultProps: { radius: "md" } },
    // Pointer cursor over the whole toggle (track, label, hit-area) so it reads as clickable.
    Switch: {
      styles: {
        track: { cursor: "pointer" },
        input: { cursor: "pointer" },
        label: { cursor: "pointer" },
      },
    },
  },
});
