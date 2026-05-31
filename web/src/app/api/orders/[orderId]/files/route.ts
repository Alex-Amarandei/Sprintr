import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import JSZip from "jszip";
import type { Database } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { getOrderDetail } from "@/lib/orders/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "order-files";
const SIGNED_TTL = 300; // seconds

type FileRef = { path: string; name: string };

/**
 * GET /api/orders/[orderId]/files — the order's attached files.
 *   default  → JSON list of short-lived signed download URLs (per-file download + display).
 *   ?zip=1   → a single ZIP of all files (used by "Descarcă toate"; browsers can't reliably
 *              trigger many downloads at once, so we bundle server-side).
 * Authorization: getOrderDetail() under the caller's RLS (customer own / shop member / admin);
 * null ⇒ 404. Files are read by the service role (the bucket is own-folder-only).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await getOrderDetail(orderId);
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const db = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: items } = await db
    .from("order_items")
    .select("item_title, files")
    .eq("order_id", orderId);

  const allFiles: FileRef[] = (items ?? []).flatMap(
    (it) => (it.files ?? []) as FileRef[],
  );

  // ── ZIP mode: download every file and bundle into one archive ──────────────
  if (req.nextUrl.searchParams.get("zip")) {
    if (!allFiles.length) return NextResponse.json({ error: "No files" }, { status: 404 });
    const zip = new JSZip();
    const used = new Map<string, number>();
    for (const f of allFiles) {
      const { data: blob } = await db.storage.from(BUCKET).download(f.path);
      if (!blob) continue;
      // De-dupe identical filenames (e.g. two lines with "doc.pdf").
      const n = used.get(f.name) ?? 0;
      used.set(f.name, n + 1);
      const dot = f.name.lastIndexOf(".");
      const name =
        n === 0
          ? f.name
          : dot > 0
            ? `${f.name.slice(0, dot)} (${n})${f.name.slice(dot)}`
            : `${f.name} (${n})`;
      zip.file(name, await blob.arrayBuffer());
    }
    const buf = await zip.generateAsync({ type: "arraybuffer" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="comanda-${orderId.slice(0, 8)}.zip"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  // ── Default: signed URLs ───────────────────────────────────────────────────
  const out: Array<{ name: string; url: string }> = [];
  for (const f of allFiles) {
    const { data: signed } = await db.storage
      .from(BUCKET)
      .createSignedUrl(f.path, SIGNED_TTL, { download: f.name });
    if (signed?.signedUrl) out.push({ name: f.name, url: signed.signedUrl });
  }
  return NextResponse.json({ files: out });
}
