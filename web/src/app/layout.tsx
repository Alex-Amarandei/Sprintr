import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "@/styles/globals.css";
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import { theme } from "@/lib/theme";
import { ServiceWorkerRegistrar } from "@/components/ui/ServiceWorkerRegistrar";
import { ThemedToaster } from "@/components/ui/ThemedToaster";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sprintr",
    template: "%s | Sprintr",
  },
  description:
    "Papetărie la ușa ta. Printare, legătorie și produse de birou livrate rapid în Iași.",
  keywords: ["papetărie", "printare", "legătorie", "livrare", "Iași"],
  applicationName: "Sprintr",
  appleWebApp: { capable: true, title: "Sprintr", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: "Sprintr",
    locale: "ro_RO",
    title: "Sprintr — Papetărie la ușa ta",
    description:
      "Printare, legătorie și produse de birou livrate rapid în Iași.",
  },
};

export const viewport = {
  themeColor: "#ea6c1f",
  // Extend under the notch/home-indicator so `env(safe-area-inset-*)` has real values
  // (sticky bars use them); harmless in a normal browser tab.
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro" {...mantineHtmlProps} className={inter.variable}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="auto">
          {children}
          <ThemedToaster />
        </MantineProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
