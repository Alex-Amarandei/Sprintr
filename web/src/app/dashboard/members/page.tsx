import { Metadata } from "next";
import { Stack, Title } from "@mantine/core";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/shop/active";
import { EmptyState } from "@/components/ui/EmptyState";
import { MembersManager } from "@/components/dashboard/MembersManager";

export const metadata: Metadata = { title: "Echipă" };

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Resolve the active shop + the caller's role there (owner can manage; others view the roster).
  const membership = await getActiveMembership();

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
      shopId={membership.id}
      isOwner={membership.role === "owner"}
      currentUserId={user.id}
    />
  );
}
