"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, Menu, Text, UnstyledButton } from "@mantine/core";
import { LayoutDashboard, LogOut, ShoppingBag, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils/format";

/**
 * Header account menu: avatar (Google picture → initials), name/email preview, link to the
 * customer's orders, an optional "switch to shop view" entry (when the user holds a shop
 * role), and sign out. Used in the customer header.
 */
export function ProfileMenu({
  name,
  email,
  avatarUrl,
  hasShopRole,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  hasShopRole: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Menu position="bottom-end" width={250} withArrow shadow="md">
      <Menu.Target>
        <UnstyledButton aria-label="Cont" style={{ display: "inline-flex", borderRadius: "50%" }}>
          <Avatar src={avatarUrl ?? undefined} size={34} radius="xl" color="brand">
            {initials(name)}
          </Avatar>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <div style={{ padding: "6px 12px 10px" }}>
          <Text fz="sm" fw={600} truncate>
            {name}
          </Text>
          <Text fz="xs" c="dimmed" truncate>
            {email}
          </Text>
        </div>
        <Menu.Divider />
        <Menu.Item component={Link} href="/orders" leftSection={<ShoppingBag size={16} />}>
          Comenzile mele
        </Menu.Item>
        {hasShopRole && (
          <Menu.Item component={Link} href="/dashboard" leftSection={<LayoutDashboard size={16} />}>
            Panou magazin
          </Menu.Item>
        )}
        <Menu.Divider />
        <Menu.Item color="red" leftSection={<LogOut size={16} />} onClick={signOut} disabled={loading}>
          Deconectează-te
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

/** Signed-out fallback — a plain link to the login page (matches the icon slot). */
export function LoginIconLink() {
  return (
    <Link href="/login" aria-label="Conectează-te" style={{ display: "inline-flex", color: "var(--mantine-color-dimmed)" }}>
      <User size={22} />
    </Link>
  );
}
