"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge, NavLink, Stack, Text } from "@mantine/core";
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

type NavItem = { href: string; label: string; icon: LucideIcon };

// Grouped into labelled sections so the nine destinations read as an organised menu
// rather than one long flat list.
const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/analytics", label: "Statistici", icon: BarChart3 },
      { href: "/dashboard/orders", label: "Comenzi", icon: ShoppingBag },
      { href: "/dashboard/messages", label: "Mesaje", icon: MessageSquare },
    ],
  },
  {
    title: "Catalog",
    items: [
      { href: "/dashboard/products", label: "Produse", icon: Package },
      { href: "/dashboard/services", label: "Servicii", icon: Wrench },
      { href: "/dashboard/offers", label: "Oferte", icon: Tag },
    ],
  },
  {
    title: "Magazin",
    items: [
      { href: "/dashboard/members", label: "Echipă", icon: Users },
      { href: "/dashboard/profile", label: "Profil", icon: User },
    ],
  },
];

export function DashboardNav({
  onNavigate,
  pendingCount = 0,
}: {
  onNavigate?: () => void;
  pendingCount?: number;
}) {
  const pathname = usePathname();
  const { count } = useUnread();

  return (
    <Stack gap={2} px="sm" pb="md">
      {SECTIONS.map((section, si) => (
        <Stack gap={2} key={section.title}>
          <Text
            component="div"
            tt="uppercase"
            fz={10}
            fw={700}
            c="dimmed"
            px="xs"
            pt={si === 0 ? 4 : "md"}
            pb={4}
            style={{ letterSpacing: "0.07em" }}
          >
            {section.title}
          </Text>
          {section.items.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);
            const showUnread = href === "/dashboard/messages" && count > 0;
            const showPending = href === "/dashboard/orders" && pendingCount > 0;
            const badgeValue = showUnread ? count : showPending ? pendingCount : 0;
            return (
              <NavLink
                key={href}
                component={Link}
                href={href}
                label={label}
                active={active}
                color="brand"
                variant="light"
                onClick={onNavigate}
                leftSection={<Icon size={18} />}
                rightSection={
                  showUnread || showPending ? (
                    <Badge
                      size="sm"
                      variant="filled"
                      color="brand"
                      aria-label={showUnread ? "mesaje necitite" : "comenzi în așteptare"}
                    >
                      {badgeValue > 9 ? "9+" : badgeValue}
                    </Badge>
                  ) : undefined
                }
                styles={{
                  root: { borderRadius: "var(--mantine-radius-md)" },
                  // Tighter icon↔label gap; dim inactive icons so the active brand row pops.
                  section: {
                    marginInlineEnd: 10,
                    color: active ? undefined : "var(--mantine-color-dimmed)",
                  },
                  label: { fontWeight: 600 },
                }}
              />
            );
          })}
        </Stack>
      ))}
    </Stack>
  );
}
