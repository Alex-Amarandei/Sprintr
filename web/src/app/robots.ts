import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private / authenticated surfaces shouldn't be indexed.
      disallow: ["/dashboard", "/order", "/orders", "/api", "/courier", "/login", "/register"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
