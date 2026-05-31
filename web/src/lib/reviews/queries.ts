import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getActiveShopId } from "@/lib/shop/active";
import { parseDocument } from "@/lib/catalog/schema";
import { formatDate } from "@/lib/utils/format";

export interface ShopReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  /** True when the review belongs to the current viewer. */
  isOwn: boolean;
}

/**
 * Aggregate shop rating (average + count) for the given shops, from the public
 * `shop`-target reviews. Computed in JS (small N this weekend); reviews are
 * public-read so the anon SSR client can read them.
 */
export async function getShopRatings(
  client: SupabaseClient,
  shopIds: string[]
): Promise<Map<string, { rating: number; count: number }>> {
  const map = new Map<string, { rating: number; count: number }>();
  if (shopIds.length === 0) return map;

  const { data } = await client
    .from("reviews")
    .select("shop_id, rating")
    .eq("target_type", "shop")
    .in("shop_id", shopIds);
  if (!data) return map;

  const acc = new Map<string, { sum: number; count: number }>();
  for (const r of data) {
    const a = acc.get(r.shop_id) ?? { sum: 0, count: 0 };
    a.sum += r.rating;
    a.count += 1;
    acc.set(r.shop_id, a);
  }
  for (const [id, a] of acc) {
    map.set(id, {
      rating: Math.round((a.sum / a.count) * 10) / 10,
      count: a.count,
    });
  }
  return map;
}

/** Shop-level reviews for the store page, newest first. */
export async function getShopReviews(shopId: string): Promise<ShopReview[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, author_id")
    .eq("target_type", "shop")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });
  if (!data) return [];

  return data.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: formatDate(r.created_at),
    isOwn: !!user && r.author_id === user.id,
  }));
}

export interface DashboardReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  targetType: "shop" | "employee" | "item";
  /** Human label for what's reviewed: "Magazin" / employee name / item title. */
  targetLabel: string;
  authorName: string;
  reply: { id: string; body: string; createdAt: string } | null;
}

/**
 * All reviews for the active shop (shop/employee/item targets), newest first, with the shop's
 * reply if any — powers the dashboard Recenzii page. Author/employee names resolve via the
 * shop-customer profiles policy; item titles from the live catalog.
 */
export async function getShopReviewsForDashboard(): Promise<DashboardReview[]> {
  const supabase = await createClient();
  const shopId = await getActiveShopId();
  if (!shopId) return [];

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, author_id, target_type, target_id")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });
  if (!reviews?.length) return [];

  const { data: replies } = await supabase
    .from("review_replies")
    .select("id, review_id, body, created_at")
    .in(
      "review_id",
      reviews.map((r) => r.id)
    )
    .order("created_at", { ascending: true });
  const replyByReview = new Map<string, { id: string; body: string; createdAt: string }>();
  for (const rep of replies ?? []) {
    if (!replyByReview.has(rep.review_id))
      replyByReview.set(rep.review_id, { id: rep.id, body: rep.body, createdAt: formatDate(rep.created_at) });
  }

  // Names for authors + reviewed employees.
  const profileIds = new Set<string>();
  for (const r of reviews) {
    profileIds.add(r.author_id);
    if (r.target_type === "employee") profileIds.add(r.target_id);
  }
  const names = new Map<string, string>();
  if (profileIds.size) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", [...profileIds]);
    for (const p of profs ?? []) if (p.full_name) names.set(p.id, p.full_name);
  }

  // Item titles from the live catalog (for item-target reviews).
  const itemTitles = new Map<string, string>();
  if (reviews.some((r) => r.target_type === "item")) {
    const { data: shop } = await supabase
      .from("shops")
      .select("active_version_id")
      .eq("id", shopId)
      .maybeSingle();
    if (shop?.active_version_id) {
      const { data: ver } = await supabase
        .from("catalog_versions")
        .select("document")
        .eq("id", shop.active_version_id)
        .maybeSingle();
      for (const it of parseDocument(ver?.document).items) itemTitles.set(it.id, it.title);
    }
  }

  return reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: formatDate(r.created_at),
    targetType: r.target_type,
    targetLabel:
      r.target_type === "shop"
        ? "Magazin"
        : r.target_type === "employee"
          ? names.get(r.target_id) ?? "Angajat"
          : itemTitles.get(r.target_id) ?? "Produs",
    authorName: names.get(r.author_id) ?? "Client",
    reply: replyByReview.get(r.id) ?? null,
  }));
}

/** The current user's existing shop review (if any) — drives the post-purchase form state. */
export async function getMyShopReview(
  shopId: string
): Promise<{ rating: number; comment: string | null } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("reviews")
    .select("rating, comment")
    .eq("target_type", "shop")
    .eq("shop_id", shopId)
    .eq("author_id", user.id)
    .maybeSingle();
  return data ?? null;
}
