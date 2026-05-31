import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const revalidate = 3600; // refresh hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = ["", "/browse", "/terms"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: "daily",
    priority: p === "" ? 1 : 0.7,
  }));

  // Public storefronts. Anon client (shops are public-read) — no request cookies needed here.
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.from("shops").select("id, created_at");
    for (const s of data ?? []) {
      staticRoutes.push({
        url: `${base}/shop/${s.id}`,
        lastModified: s.created_at ?? undefined,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    /* sitemap is best-effort — never fail the build over it */
  }

  return staticRoutes;
}
