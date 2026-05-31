import type { Item } from "./schema";

/**
 * Catalog item images — the single seam where object storage plugs in.
 *
 * Images are stored as paths inside a public bucket; `item.images[0]` is the main
 * one shown to customers and in the builder. Picking files only creates LOCAL previews
 * (blob: URLs) — nothing is uploaded until the catalog is SAVED, at which point
 * `persistLocalImage` runs. Today the bucket isn't provisioned yet, so that save-time
 * upload fails with a clear message until backend creates it.
 *
 * ──> TO CONNECT STORAGE (one place):
 *   1. Backend creates a PUBLIC bucket named `ITEM_IMAGE_BUCKET` with RLS:
 *        - shop members may write objects under `shops/<shop_id>/items/…`
 *        - public read.
 *   2. That's it — `persistLocalImage` (called on save) already uploads to it and
 *      `itemImageUrl` already resolves public URLs. If you use raw S3/CloudFront
 *      instead, swap the body of these two functions only; callers don't change.
 */
export const ITEM_IMAGE_BUCKET = "shop-assets";

/** Max size per uploaded image (MB). With MAX_IMAGES (schema) this caps per-item storage. */
export const MAX_IMAGE_MB = 5;

/** Neutral grey square shown while/when there's no image. */
export const IMAGE_PLACEHOLDER =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='76' height='76'%3E%3Crect width='76' height='76' fill='%23e9ecef'/%3E%3C/svg%3E";

/** Resolve a stored image path (or absolute URL) to a displayable URL. */
export function itemImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/.test(path)) return path; // already a URL
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${ITEM_IMAGE_BUCKET}/${path}`;
}

/** The main image for an item (first of `images`, falling back to legacy `image_path`). */
export function mainImage(item: Pick<Item, "images" | "image_path">): string | null {
  return item.images?.[0] ?? item.image_path ?? null;
}

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

/** A not-yet-stored image: a local preview (blob:/data: URL) held only in the browser. */
export function isLocalImage(path: string): boolean {
  return path.startsWith("blob:") || path.startsWith("data:");
}

async function uploadBlob(blob: Blob, shopId: string): Promise<string> {
  // Imported lazily so this module stays importable from server components (for
  // itemImageUrl/mainImage) without pulling in the browser client.
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();

  const ext = MIME_EXT[blob.type] ?? "png";
  const path = `shops/${shopId}/items/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(ITEM_IMAGE_BUCKET).upload(path, blob, {
    cacheControl: "3600",
    upsert: false,
    contentType: blob.type || undefined,
  });
  if (error) {
    // Most likely the bucket isn't created yet.
    throw new Error(
      /not found|does not exist|bucket/i.test(error.message)
        ? "Stocarea imaginilor nu este configurată încă."
        : error.message
    );
  }
  return path;
}

/**
 * Upload a locally-previewed image (its blob:/data: URL) and return the stored path.
 * Called at SAVE time for each pending image, never on pick.
 */
export async function persistLocalImage(localUrl: string, shopId: string): Promise<string> {
  const blob = await fetch(localUrl).then((r) => r.blob());
  return uploadBlob(blob, shopId);
}
