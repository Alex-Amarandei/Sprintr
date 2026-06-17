import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface SavedPhone {
  id: string;
  label: string | null;
  phone: string;
  isDefault: boolean;
}

/** The current user's saved contact phones (default first), or [] when signed out. */
export async function getMyPhones(): Promise<SavedPhone[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("saved_phones")
    .select("id, label, phone, is_default")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []).map((p) => ({
    id: p.id,
    label: p.label,
    phone: p.phone,
    isDefault: p.is_default,
  }));
}
