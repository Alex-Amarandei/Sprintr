import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getShopRatings } from "@/lib/reviews/queries";
import { parseDocument, type Category, type Item } from "./schema";
import { shopAssetUrl } from "@/lib/storage/shopAssets";
import { getScheduleStatus, type WeeklySchedule } from "@/lib/shop/schedule";
import type { SampleShop, ShopCategory } from "./samples";

/**
 * Server-side reads of real shops + their live catalog from Supabase.
 * Maps DB rows into the `SampleShop` shape the UI already consumes (rating/eta/etc.
 * are not in the DB yet → left undefined; the cards degrade gracefully).
 */

type ScheduleDay = { open: string; close: string } | null;
type Schedule = Record<string, ScheduleDay>;

function deriveCategory(name: string): ShopCategory {
  const n = name.toLowerCase();
  if (/copy|copie|copiere/.test(n)) return "copy";
  if (/legat|bind|broșur|brosur/.test(n)) return "binding";
  if (/birot|papet|stationery/.test(n)) return "stationery";
  return "print";
}

/**
 * Open-now per CLAUDE.md: overrides[today] wins, else weekly schedule[weekday]. Delegates to the
 * shared, Bucharest-aware `getScheduleStatus` so the served `isOpen` flag and the storefront
 * badge always agree (and the time is Romanian wall-clock, not the UTC server clock).
 */
function isOpenNow(
  schedule: Schedule | null,
  overrides: Record<string, ScheduleDay> | null
): boolean | undefined {
  if (!schedule && !overrides) return undefined;
  return getScheduleStatus((schedule ?? {}) as WeeklySchedule, overrides ?? {}).open;
}

function toView(row: {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  logo_path: string | null;
  banner_path: string | null;
  delivery_fee?: number | null;
  schedule: unknown;
  schedule_overrides: unknown;
}): SampleShop {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    address: row.address ?? "Iași",
    phone: row.phone ?? undefined,
    deliveryFee: Number(row.delivery_fee ?? 0),
    category: deriveCategory(row.name),
    isOpen: isOpenNow(
      row.schedule as Schedule | null,
      row.schedule_overrides as Record<string, ScheduleDay> | null
    ),
    schedule: (row.schedule as SampleShop["schedule"]) ?? null,
    scheduleOverrides:
      (row.schedule_overrides as SampleShop["scheduleOverrides"]) ?? {},
    logoUrl: shopAssetUrl(row.logo_path),
    bannerUrl: shopAssetUrl(row.banner_path),
  };
}

export async function getShops(): Promise<SampleShop[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shops")
    .select("id, name, description, address, phone, logo_path, banner_path, delivery_fee, schedule, schedule_overrides")
    .order("created_at", { ascending: true });
  if (error || !data) return [];

  const ratings = await getShopRatings(
    supabase,
    data.map((r) => r.id)
  );
  return data.map((row) => {
    const view = toView(row);
    const agg = ratings.get(row.id);
    if (agg) {
      view.rating = agg.rating;
      view.reviews = agg.count;
    }
    return view;
  });
}

export async function getShopView(id: string): Promise<SampleShop | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shops")
    .select("id, name, description, address, phone, logo_path, banner_path, delivery_fee, schedule, schedule_overrides")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const view = toView(data);
  const agg = (await getShopRatings(supabase, [id])).get(id);
  if (agg) {
    view.rating = agg.rating;
    view.reviews = agg.count;
  }
  return view;
}

/** Items from the shop's live (active) catalog version. */
export async function getShopCatalog(
  id: string
): Promise<{ items: Item[]; categories: Category[] }> {
  const supabase = await createClient();
  const { data: shop } = await supabase
    .from("shops")
    .select("active_version_id")
    .eq("id", id)
    .maybeSingle();
  if (!shop?.active_version_id) return { items: [], categories: [] };
  const { data: version } = await supabase
    .from("catalog_versions")
    .select("document")
    .eq("id", shop.active_version_id)
    .maybeSingle();
  const doc = parseDocument(version?.document);
  return {
    // Hide unpublished (is_active) AND out-of-stock items from customers.
    items: doc.items.filter((it) => it.is_active && it.in_stock),
    categories: doc.categories,
  };
}
