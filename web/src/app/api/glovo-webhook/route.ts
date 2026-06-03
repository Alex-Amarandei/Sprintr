import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { isGlovoEnabled, verifyGlovoWebhook } from "@/lib/delivery/glovo";

export const dynamic = "force-dynamic";

/**
 * Glovo courier status webhook — Glovo POSTs delivery status changes (accepted, picked-up,
 * delivered, cancelled…) + courier details. We verify the signature, then update the matching
 * order's `courier_*` fields. Service role (no user context).
 *
 * No-op + 404 when the integration is disabled, so the endpoint is inert until configured.
 * TODO(glovo): confirm the signature header name + the body field names against the live docs.
 */
export async function POST(req: NextRequest) {
  if (!isGlovoEnabled()) return NextResponse.json({ error: "disabled" }, { status: 404 });

  const raw = await req.text();
  const signature =
    req.headers.get("x-glovo-signature") ?? req.headers.get("glovo-signature");
  if (!verifyGlovoWebhook(raw, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const ref = String(body.orderId ?? body.id ?? "");
  if (!ref) return NextResponse.json({ ok: true });
  const status = body.state ?? body.status;
  const courier = (body.courier ?? body.glover) as { name?: string; phone?: string } | undefined;

  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  await db
    .from("orders")
    .update({
      courier_status: status != null ? String(status) : null,
      ...(courier?.name ? { courier_name: courier.name } : {}),
      ...(courier?.phone ? { courier_phone: courier.phone } : {}),
    })
    .eq("courier_ref", ref);

  return NextResponse.json({ ok: true });
}
