import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getShopConversations } from "@/lib/messages/queries";
import { MessagesInbox } from "@/components/dashboard/MessagesInbox";

export const metadata: Metadata = { title: "Mesaje" };

export default async function ShopMessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const conversations = await getShopConversations();

  return <MessagesInbox conversations={conversations} currentUserId={user?.id ?? ""} />;
}
