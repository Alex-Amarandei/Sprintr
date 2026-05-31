"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Save a new delivery address (RLS scopes to the caller). */
export async function addAddress(input: {
  label?: string | null;
  address: string;
  lat?: number | null;
  lng?: number | null;
  makeDefault?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const address = input.address.trim();
  if (!address) return { ok: false, error: "Adresa este obligatorie" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  if (input.makeDefault) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  }
  const { error } = await supabase.from("addresses").insert({
    user_id: user.id,
    label: input.label?.trim() || null,
    address,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    is_default: !!input.makeDefault,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/addresses");
  return { ok: true };
}

export async function deleteAddress(id: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  await supabase.from("addresses").delete().eq("id", id);
  revalidatePath("/addresses");
  return { ok: true };
}

export async function setDefaultAddress(id: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  await supabase.from("addresses").update({ is_default: true }).eq("id", id);
  revalidatePath("/addresses");
  return { ok: true };
}
