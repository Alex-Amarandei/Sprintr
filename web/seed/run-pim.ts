/**
 * Apply the PIM Copy seed to Supabase using the service-role key (bypasses RLS).
 * Drops the old demo PIM Copy shop (+ its demo orders), then inserts the 5 real locations
 * with their catalog versions and marks the owner profile as `owner` on each.
 *
 * Run from web/:  bun run seed/run-pim.ts
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";
import { shops, OWNER_PROFILE_ID, OLD_PIM_SHOP_ID } from "./build-pim";

// Minimal .env.local loader (KEY=VALUE, ignores comments/quotes).
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const i = t.indexOf("=");
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  } catch { /* fall back to process.env */ }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

const db = createClient<Database>(url, key, { auth: { persistSession: false } });
const die = (msg: string, e: unknown) => { throw new Error(`${msg}: ${JSON.stringify(e)}`); };

// 1. Drop the old demo PIM Copy shop (orders first — shops->orders is RESTRICT).
{
  const { error: oe } = await db.from("orders").delete().eq("shop_id", OLD_PIM_SHOP_ID);
  if (oe) die("delete old orders", oe);
  const { error: se } = await db.from("shops").delete().eq("id", OLD_PIM_SHOP_ID);
  if (se) die("delete old shop", se);
  console.log("✓ Dropped old PIM Copy shop + its demo orders.");
}

// 2. Insert the 5 real locations.
for (const s of shops) {
  const website = (s as { website?: string }).website ?? "https://pimcopy.ro";
  const { data: shop, error: ie } = await db
    .from("shops")
    .insert({
      name: s.name,
      description: s.description,
      address: s.address,
      phones: [...s.phones],
      website_url: website,
      email: s.email,
      lat: s.lat,
      lng: s.lng,
      schedule: s.schedule,
      logo_path: "https://pimcopy.ro/assets/images/logo.png",
      default_eta_minutes: s.eta,
      delivery_fee: 0,
      is_active: true,
    })
    .select("id")
    .single();
  if (ie || !shop) die(`insert shop ${s.name}`, ie);

  const { data: ver, error: ve } = await db
    .from("catalog_versions")
    .insert({
      shop_id: shop!.id,
      version: 1,
      status: "published",
      label: "Catalog inițial",
      document: s.doc as unknown as Database["public"]["Tables"]["catalog_versions"]["Insert"]["document"],
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (ve || !ver) die(`insert catalog_version ${s.name}`, ve);

  const { error: ue } = await db.from("shops").update({ active_version_id: ver!.id }).eq("id", shop!.id);
  if (ue) die(`set active version ${s.name}`, ue);

  const { error: pe } = await db
    .from("shop_permissions")
    .insert({ shop_id: shop!.id, profile_id: OWNER_PROFILE_ID, role: "owner" });
  if (pe) die(`insert owner permission ${s.name}`, pe);

  console.log(`✓ ${s.name}  shop=${shop!.id}  version=${ver!.id}  items=${s.doc.items.length}`);
}

console.log("✓ PIM Copy seed applied.");
