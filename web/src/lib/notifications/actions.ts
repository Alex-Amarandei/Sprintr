"use server";

import { createClient } from "@/lib/supabase/server";

/** Mark notifications read (all unread, or a specific set). RLS limits to the caller's own rows. */
export async function markNotificationsRead(ids?: string[]): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  let q = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (ids?.length) q = q.in("id", ids);
  await q;
  return { ok: true };
}
