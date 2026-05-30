"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/design/status";

/**
 * Shop-side: advance an order's status (accept/reject/in_progress/done).
 * RLS authorizes (shop staff+). On accept we stamp `handled_by` = current member.
 */
export async function advanceOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  const patch: { status: OrderStatus; handled_by?: string } = { status };
  if (status === "accepted") patch.handled_by = user.id;

  const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
  return { ok: true };
}
