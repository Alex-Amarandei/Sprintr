import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { getOrderDetail } from "@/lib/orders/queries";
import { buildInvoiceData } from "@/lib/invoice/data";
import { renderInvoicePdf } from "@/lib/invoice/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/orders/[orderId]/invoice — download the order's receipt as a PDF.
 * Authorization: getOrderDetail() runs under the caller's RLS (customer sees own,
 * shop members see their shop's, admins everything) — null ⇒ not allowed. The PDF
 * data itself is then loaded with the service client (accurate names + full breakdown).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Auth gate: only returns the order if the caller is allowed to see it (RLS).
  const allowed = await getOrderDetail(orderId);
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const db = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const data = await buildInvoiceData(orderId, db);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pdf = await renderInvoicePdf(data);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="chitanta-${data.orderShortId}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
