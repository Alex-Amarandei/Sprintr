import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Recent notifications for the current user + total unread count (RLS scopes to own rows). */
export async function getMyNotifications(
  limit = 20
): Promise<{ items: AppNotification[]; unread: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], unread: 0 };

  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, href, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  return {
    items: (data ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      readAt: n.read_at,
      createdAt: n.created_at,
    })),
    unread: count ?? 0,
  };
}
