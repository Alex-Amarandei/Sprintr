import { createTheme, type MantineColorsTuple } from "@mantine/core";

// SprintR brand orange (10 shades required by Mantine).
const brand: MantineColorsTuple = [
  "#fff7ed",
  "#ffedd5",
  "#fed7aa",
  "#fdba74",
  "#fb923c",
  "#f97316",
  "#ea580c",
  "#c2410c",
  "#9a3412",
  "#7c2d12",
];

export const theme = createTheme({
  primaryColor: "brand",
  primaryShade: 6,
  colors: { brand },
  defaultRadius: "md",
  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  headings: { fontFamily: "var(--font-geist-sans), system-ui, sans-serif" },
});
