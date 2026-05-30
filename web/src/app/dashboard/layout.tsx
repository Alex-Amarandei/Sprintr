import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Wrench,
  Tag,
  User,
} from "lucide-react";
import { Box, Stack, Text } from "@mantine/core";
import { LinkAnchor, LinkNavItem } from "@/components/ui/links";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Comenzi", icon: ShoppingBag },
  { href: "/dashboard/products", label: "Produse", icon: Package },
  { href: "/dashboard/services", label: "Servicii", icon: Wrench },
  { href: "/dashboard/offers", label: "Oferte", icon: Tag },
  { href: "/dashboard/profile", label: "Profil", icon: User },
];

const SIDEBAR_WIDTH = 260;

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box mih="100vh" bg="gray.0">
      <Box
        component="aside"
        w={SIDEBAR_WIDTH}
        bg="white"
        style={{
          position: "fixed",
          insetBlock: 0,
          left: 0,
          borderRight: "1px solid var(--mantine-color-gray-2)",
        }}
      >
        <Box
          p="lg"
          style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
        >
          <LinkAnchor
            href="/dashboard"
            fw={700}
            fz="xl"
            c="brand.6"
            underline="never"
          >
            SprintR
          </LinkAnchor>
          <Text size="xs" c="dimmed" mt={2}>
            Panou magazin
          </Text>
        </Box>
        <Stack gap={4} p="sm">
          {navItems.map(({ href, label, icon: Icon }) => (
            <LinkNavItem
              key={href}
              href={href}
              label={label}
              leftSection={<Icon size={18} />}
            />
          ))}
        </Stack>
      </Box>
      <Box component="main" ml={SIDEBAR_WIDTH} p="xl">
        {children}
      </Box>
    </Box>
  );
}
