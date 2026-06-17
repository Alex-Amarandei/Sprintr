"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { phoneError, sanitizePhoneInput } from "@/lib/utils/validation";

/** Save a new contact phone (RLS scopes to the caller). */
export async function addPhone(input: {
  label?: string | null;
  phone: string;
  makeDefault?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const phone = sanitizePhoneInput(input.phone).trim();
  const invalid = phoneError(phone);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  if (input.makeDefault) {
    await supabase.from("saved_phones").update({ is_default: false }).eq("user_id", user.id);
  }
  const { error } = await supabase.from("saved_phones").insert({
    user_id: user.id,
    label: input.label?.trim() || null,
    phone,
    is_default: !!input.makeDefault,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/account");
  return { ok: true };
}

export async function deletePhone(id: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  await supabase.from("saved_phones").delete().eq("id", id);
  revalidatePath("/account");
  return { ok: true };
}

export async function setDefaultPhone(id: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  await supabase.from("saved_phones").update({ is_default: false }).eq("user_id", user.id);
  await supabase.from("saved_phones").update({ is_default: true }).eq("id", id);
  revalidatePath("/account");
  return { ok: true };
}
