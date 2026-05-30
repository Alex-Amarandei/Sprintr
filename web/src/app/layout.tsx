import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@mantine/core/styles.css";
import "@/styles/globals.css";
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import { Toaster } from "sonner";
import { theme } from "@/lib/theme";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SprintR",
    template: "%s | SprintR",
  },
  description:
    "Papetărie la ușa ta. Printare, legătorie și produse de birou livrate rapid în Iași.",
  keywords: ["papetărie", "printare", "legătorie", "livrare", "Iași"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro" {...mantineHtmlProps} className={inter.variable}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider theme={theme}>{children}</MantineProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
