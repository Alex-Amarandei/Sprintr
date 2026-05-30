// Seed Supabase with shops + published catalog documents from the seed JSONs.
// Uses the SERVICE ROLE key (bypasses RLS) — run locally only. Idempotent by shop name.
// Run: bun run scripts/seed-db.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { convert } from "./seed-to-document.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

async function publishVersion(shopId, versionId) {
  await sb
    .from("catalog_versions")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", versionId);
  await sb.from("shops").update({ active_version_id: versionId }).eq("id", shopId);
}

// 1) Publish PIM Copy's existing (already-seeded) draft so it goes live.
async function publishExisting(name) {
  const { data: shop } = await sb
    .from("shops")
    .select("id, active_version_id")
    .eq("name", name)
    .maybeSingle();
  if (!shop) return console.log(`· ${name}: not found, skipping`);
  if (shop.active_version_id)
    return console.log(`· ${name}: already published`);
  const { data: ver } = await sb
    .from("catalog_versions")
    .select("id, version")
    .eq("shop_id", shop.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!ver) return console.log(`· ${name}: no catalog version to publish`);
  await publishVersion(shop.id, ver.id);
  console.log(`✓ ${name}: published v${ver.version}`);
}

// 2) Create a shop (if missing) from a seed file + insert a published catalog.
async function seedShop(file) {
  const seed = JSON.parse(readFileSync(file, "utf8"));
  const s = seed.shop;
  let { data: shop } = await sb
    .from("shops")
    .select("id")
    .eq("name", s.name)
    .maybeSingle();

  if (!shop) {
    const { data, error } = await sb
      .from("shops")
      .insert({
        name: s.name,
        description: s.description ?? null,
        phone: s.phone ?? null,
        address: s.address ?? null,
        schedule: s.schedule ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    shop = data;
    console.log(`✓ ${s.name}: shop created ${shop.id}`);
  } else {
    console.log(`· ${s.name}: shop exists ${shop.id}`);
  }

  // next version number
  const { data: last } = await sb
    .from("catalog_versions")
    .select("version")
    .eq("shop_id", shop.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (last?.version ?? 0) + 1;

  const document = convert(seed);
  const { data: ver, error: vErr } = await sb
    .from("catalog_versions")
    .insert({
      shop_id: shop.id,
      version,
      label: "seed",
      status: "published",
      document,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (vErr) throw vErr;
  await sb.from("shops").update({ active_version_id: ver.id }).eq("id", shop.id);
  console.log(
    `✓ ${s.name}: catalog v${version} published (${document.items.length} items)`
  );
}

await publishExisting("PIM Copy");
await seedShop("seed/printhaus.json");
await seedShop("seed/stef.json");
console.log("Done.");
