"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge, NavLink, Stack } from "@mantine/core";
import {
  BarChart3,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  Package,
  ShoppingBag,
  Tag,
  User,
  Users,
  Wrench,
} from "lucide-react";
import { useUnread } from "./UnreadProvider";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/analytics", label: "Statistici", icon: BarChart3 },
  { href: "/dashboard/orders", label: "Comenzi", icon: ShoppingBag },
  { href: "/dashboard/messages", label: "Mesaje", icon: MessageSquare },
  { href: "/dashboard/products", label: "Produse", icon: Package },
  { href: "/dashboard/services", label: "Servicii", icon: Wrench },
  { href: "/dashboard/offers", label: "Oferte", icon: Tag },
  { href: "/dashboard/members", label: "Echipă", icon: Users },
  { href: "/dashboard/profile", label: "Profil", icon: User },
];

export function DashboardNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { count } = useUnread();

  return (
    <Stack gap={4} p="sm">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
        const showUnread = href === "/dashboard/messages" && count > 0;
        return (
          <NavLink
            key={href}
            component={Link}
            href={href}
            label={label}
            active={active}
            onClick={onNavigate}
            leftSection={<Icon size={18} />}
            rightSection={
              showUnread ? (
                <Badge size="sm" variant="filled" color="brand" aria-label="mesaje necitite">
                  {count > 9 ? "9+" : count}
                </Badge>
              ) : undefined
            }
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
