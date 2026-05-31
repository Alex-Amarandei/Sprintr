"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Shop reply to a review. RLS (`review_replies_insert_staff`) authorizes: only a member of the
 * reviewed review's shop, posting as themselves. One reply per review is a UI convention.
 */
export async function replyToReview(
  reviewId: string,
  body: string
): Promise<{ ok: boolean; error?: string }> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Răspunsul nu poate fi gol" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Neautentificat" };

  const { error } = await supabase
    .from("review_replies")
    .insert({ review_id: reviewId, author_id: user.id, body: text });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/reviews");
  return { ok: true };
}
