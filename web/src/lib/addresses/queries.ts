import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface SavedAddress {
  id: string;
  label: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
}

/** The current user's saved delivery addresses (default first), or [] when signed out. */
export async function getMyAddresses(): Promise<SavedAddress[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("addresses")
    .select("id, label, address, lat, lng, is_default")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []).map((a) => ({
    id: a.id,
    label: a.label,
    address: a.address,
    lat: a.lat,
    lng: a.lng,
    isDefault: a.is_default,
  }));
}
