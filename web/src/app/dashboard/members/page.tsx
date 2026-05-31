import { Metadata } from "next";
import { Stack, Title } from "@mantine/core";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/EmptyState";
import { MembersManager } from "@/components/dashboard/MembersManager";

export const metadata: Metadata = { title: "Echipă" };

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Resolve the caller's shop + their role (owner can manage; others view the roster).
  const { data: membership } = await supabase
    .from("shop_permissions")
    .select("shop_id, role")
    .eq("profile_id", user?.id ?? "")
    .limit(1)
    .maybeSingle();

  if (!user || !membership) {
    return (
      <Stack gap="lg">
        <Title order={2}>Echipă</Title>
        <EmptyState
          icon={<Users size={26} />}
          title="Niciun magazin asociat"
          description="Contul tău nu este asociat unui magazin. Contactează un administrator."
        />
      </Stack>
    );
  }

  return (
    <MembersManager
      shopId={membership.shop_id}
      isOwner={membership.role === "owner"}
      currentUserId={user.id}
    />
  );
}
