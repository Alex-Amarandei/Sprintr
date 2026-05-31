"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, Badge, Group, Menu, Text, UnstyledButton } from "@mantine/core";
import { Check, ChevronDown, LogOut, Store, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setActiveShop } from "@/lib/shop/actions";
import { initials } from "@/lib/utils/format";

type Shop = { id: string; name: string; role: string };

const ROLE_LABEL: Record<string, string> = {
  staff: "Angajat",
  catalog: "Catalog",
  owner: "Proprietar",
};

/**
 * Dashboard top strip: the active shop's name + your role (left), a shop switcher when you
 * belong to several shops, and an account menu (view-as-customer + sign out) (right).
 */
export function DashboardTopbar({
  name,
  email,
  avatarUrl,
  role,
  shops,
  activeShopId,
  activeShopName,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  shops: Shop[];
  activeShopId: string | null;
  activeShopName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [signingOut, setSigningOut] = useState(false);
  const multi = shops.length > 1;

  function switchShop(id: string) {
    if (id === activeShopId) return;
    startTransition(async () => {
      await setActiveShop(id);
      router.refresh();
    });
  }

  async function signOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const companyBadge = (
    <Badge
      size="lg"
      variant="light"
      color="brand"
      leftSection={<Store size={13} />}
      rightSection={multi ? <ChevronDown size={13} /> : undefined}
      style={{ cursor: multi ? "pointer" : "default", textTransform: "none" }}
    >
      {activeShopName}
    </Badge>
  );

  return (
    <Group justify="space-between" align="center" wrap="nowrap" mb="lg">
      {!activeShopId ? (
        <div />
      ) : (
      <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
        {multi ? (
          <Menu position="bottom-start" width={240} withArrow shadow="md">
            <Menu.Target>
              <UnstyledButton disabled={pending}>{companyBadge}</UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Magazinele tale</Menu.Label>
              {shops.map((s) => (
                <Menu.Item
                  key={s.id}
                  leftSection={<Store size={15} />}
                  rightSection={s.id === activeShopId ? <Check size={14} /> : undefined}
                  onClick={() => switchShop(s.id)}
                >
                  {s.name}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        ) : (
          companyBadge
        )}
        <Badge size="lg" variant="default" style={{ textTransform: "none" }}>
          {ROLE_LABEL[role] ?? role}
        </Badge>
      </Group>
      )}

      <Menu
        position="bottom-end"
        width={240}
        withArrow
        shadow="md"
        // Smaller, semi-bold option labels.
        styles={{ item: { fontSize: "var(--mantine-font-size-xs)", fontWeight: 600 } }}
      >
        <Menu.Target>
          <UnstyledButton aria-label="Cont" style={{ display: "inline-flex", borderRadius: "50%" }}>
            <Avatar
              src={avatarUrl ?? undefined}
              size={34}
              radius="xl"
              color="brand"
              imageProps={{ referrerPolicy: "no-referrer" }}
            >
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
          <Menu.Item component={Link} href="/browse" leftSection={<UserRound size={16} />}>
            Vizualizare mod client
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item color="red" leftSection={<LogOut size={16} />} onClick={signOut} disabled={signingOut}>
            Deconectează-te
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
