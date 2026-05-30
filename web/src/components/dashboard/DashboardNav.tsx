"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavLink, Stack } from "@mantine/core";
import {
  LayoutDashboard,
  type LucideIcon,
  Package,
  ShoppingBag,
  Tag,
  User,
  Wrench,
} from "lucide-react";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Comenzi", icon: ShoppingBag },
  { href: "/dashboard/products", label: "Produse", icon: Package },
  { href: "/dashboard/services", label: "Servicii", icon: Wrench },
  { href: "/dashboard/offers", label: "Oferte", icon: Tag },
  { href: "/dashboard/profile", label: "Profil", icon: User },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <Stack gap={4} p="sm">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
        return (
          <NavLink
            key={href}
            component={Link}
            href={href}
            label={label}
            active={active}
            leftSection={<Icon size={18} />}
            styles={{
              root: {
                color: "var(--mantine-color-text)",
                borderRadius: "var(--mantine-radius-md)",
                backgroundColor: active
                  ? "light-dark(var(--mantine-color-stone-1), var(--mantine-color-dark-5))"
                  : undefined,
              },
              // Tighter gap between icon and label.
              section: { marginInlineEnd: 8 },
              // Semibold menu labels.
              label: { fontWeight: 600, color: "var(--mantine-color-text)" },
            }}
          />
        );
      })}
    </Stack>
  );
}
