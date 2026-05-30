import { redirect } from "next/navigation";
import { Box, Group } from "@mantine/core";
import { LinkAnchor } from "@/components/ui/links";
import { Wordmark } from "@/components/ui/Wordmark";
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
      {/* Desktop fixed sidebar */}
      <Box
        component="aside"
        visibleFrom="md"
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
              <Wordmark />
            </LinkAnchor>
            <SignOutButton />
          </Group>
        </Box>
        <DashboardNav />
      </Box>

      {/* Mobile top bar + nav */}
      <Box
        hiddenFrom="md"
        bg="white"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid var(--mantine-color-gray-2)",
        }}
      >
        <Group justify="space-between" align="center" wrap="nowrap" p="md">
          <LinkAnchor
            href="/dashboard"
            fw={700}
            fz="xl"
            c="brand.6"
            underline="never"
          >
            <Wordmark />
          </LinkAnchor>
          <SignOutButton />
        </Group>
        <DashboardNav />
      </Box>

      <Box
        component="main"
        ml={{ base: 0, md: SIDEBAR_WIDTH }}
        p={{ base: "md", md: "xl" }}
      >
        {children}
      </Box>
    </Box>
  );
}
