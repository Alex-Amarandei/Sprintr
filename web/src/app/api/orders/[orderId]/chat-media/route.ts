import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { getOrderDetail } from "@/lib/orders/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "chat-media";
const SIGNED_TTL = 86400; // 1 day

/**
 * GET /api/orders/[orderId]/chat-media?path=<storage path> — redirect to a short-lived signed URL
 * for a chat image. Used as the `src` of <img> in both chat panels.
 * Authorization: getOrderDetail() under the caller's RLS (customer own / shop member / admin) → 404
 * if not allowed. The path must belong to a message of THIS order (so a participant can't read
 * arbitrary objects in the bucket). Images are read by the service role (bucket is own-folder-only).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const path = req.nextUrl.searchParams.get("path");
  if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 });

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

  // The path must be referenced by a message attachment of this order.
  const { data: owner } = await db
    .from("messages")
    .select("id")
    .eq("order_id", orderId)
    .contains("attachments", [{ path }])
    .limit(1)
    .maybeSingle();
  if (!owner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: signed } = await db.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_TTL);
  if (!signed?.signedUrl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.redirect(signed.signedUrl);
}
