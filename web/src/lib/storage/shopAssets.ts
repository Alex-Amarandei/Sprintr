/**
 * Shop storefront assets (logo, banner) in the public `shop-assets` bucket. RLS allows a
 * shop member to write under their own `shops/<shop_id>/…`; reads are public URLs.
 * (Catalog item images use the same bucket — see lib/catalog/images.ts.)
 *
 * `shopAssetUrl` is pure (env only) so it's safe to import from server components; the
 * browser client is imported lazily inside `uploadShopAsset`.
 */
const BUCKET = "shop-assets";

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

/** Public URL for a shop-assets path (or an absolute URL passed through). */
export function shopAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:/.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** Upload a shop logo/banner; returns its stored path (to save on `shops`). */
export async function uploadShopAsset(
  file: File,
  shopId: string,
  kind: "logo" | "banner"
): Promise<string> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const ext = MIME_EXT[file.type] ?? (file.name.split(".").pop()?.toLowerCase() || "png");
  const path = `shops/${shopId}/${kind}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  return path;
}
