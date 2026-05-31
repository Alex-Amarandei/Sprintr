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
import { Toaster } from "sonner";
import { theme } from "@/lib/theme";
import { ServiceWorkerRegistrar } from "@/components/ui/ServiceWorkerRegistrar";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SprintR",
    template: "%s | SprintR",
  },
  description:
    "Papetărie la ușa ta. Printare, legătorie și produse de birou livrate rapid în Iași.",
  keywords: ["papetărie", "printare", "legătorie", "livrare", "Iași"],
  applicationName: "SprintR",
  appleWebApp: { capable: true, title: "SprintR", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: "SprintR",
    locale: "ro_RO",
    title: "SprintR — Papetărie la ușa ta",
    description:
      "Printare, legătorie și produse de birou livrate rapid în Iași.",
  },
};

export const viewport = {
  themeColor: "#ea6c1f",
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
        </MantineProvider>
        <Toaster position="bottom-right" richColors closeButton />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
