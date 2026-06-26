import { createClient } from "@/lib/supabase/client";

/** A frozen reference to an uploaded chat image: its storage path + original filename. */
export interface ChatMediaRef {
  path: string;
  name: string;
}

const BUCKET = "chat-media";
/** Accepted image types for chat attachments. */
export const CHAT_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const MAX_MB = 8;

/**
 * Upload chat images to the private `chat-media` bucket, under the caller's own folder
 * (`{uid}/…`, which the bucket RLS requires). Returns a { path, name } per file to store on the
 * message's `attachments`. Reads happen via the order-participant-checked signed-URL endpoint
 * (`GET /api/orders/[id]/chat-media`), never a public URL.
 */
export async function uploadChatImages(files: File[]): Promise<ChatMediaRef[]> {
  if (!files.length) return [];
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Trebuie să fii autentificat pentru a trimite imagini.");

  const refs: ChatMediaRef[] = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Poți trimite doar imagini.");
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      throw new Error(`Imaginea „${file.name}” depășește ${MAX_MB} MB.`);
    }
    const dot = file.name.lastIndexOf(".");
    const ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : "jpg";
    const key = `${user.id}/${crypto.randomUUID()}.${ext}`;
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
