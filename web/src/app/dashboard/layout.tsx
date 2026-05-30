import { redirect } from "next/navigation";
import { Box, Group } from "@mantine/core";
import { LinkAnchor } from "@/components/ui/links";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { createClient } from "@/lib/supabase/server";

const SIDEBAR_WIDTH = 260;

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Shop-only area. Middleware already requires auth; here we enforce the role.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "shop" && profile?.role !== "admin") redirect("/browse");

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
          <Group justify="space-between" align="center" wrap="nowrap">
            <LinkAnchor
              href="/dashboard"
              fw={700}
              fz="xl"
              c="brand.6"
              underline="never"
            >
              SprintR
            </LinkAnchor>
            <SignOutButton />
          </Group>
        </Box>
        <DashboardNav />
      </Box>
      <Box component="main" ml={SIDEBAR_WIDTH} p="xl">
        {children}
      </Box>
    </Box>
  );
}
