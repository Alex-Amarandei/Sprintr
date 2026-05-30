"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionIcon, Tooltip } from "@mantine/core";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Tooltip label="Deconectează-te">
      <ActionIcon
        variant="subtle"
        color="gray"
        size="lg"
        onClick={signOut}
        loading={loading}
        aria-label="Deconectează-te"
      >
        <LogOut size={20} />
      </ActionIcon>
    </Tooltip>
  );
}
