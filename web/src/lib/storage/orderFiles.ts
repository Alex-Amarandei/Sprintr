import { createClient } from "@/lib/supabase/client";

/** A frozen reference to an uploaded order file: its storage path + original filename. */
export interface OrderFileRef {
  path: string;
  name: string;
}

const BUCKET = "order-files";

/**
 * Upload customer files to the private `order-files` bucket, under the caller's own folder
 * (`{uid}/…`, which the bucket RLS requires). Returns a { path, name } per file to freeze onto
 * the order. Called at checkout, when the user is authenticated. Pre-placement: a temp object
 * keyed by uuid; it simply lives in the customer's folder and is referenced by the order.
 */
export async function uploadOrderFiles(files: File[]): Promise<OrderFileRef[]> {
  if (!files.length) return [];
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Trebuie să fii autentificat pentru a încărca fișiere.");

  const refs: OrderFileRef[] = [];
  for (const file of files) {
    const dot = file.name.lastIndexOf(".");
    const ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : "";
    const key = `${user.id}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
    const { error } = await supabase.storage.from(BUCKET).upload(key, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) throw error;
    refs.push({ path: key, name: file.name });
  }
  return refs;
}
