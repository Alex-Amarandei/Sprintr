import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
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
