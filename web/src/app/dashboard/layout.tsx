import { redirect } from "next/navigation";
import { Box, Group } from "@mantine/core";
import { LinkAnchor } from "@/components/ui/links";
import { Logo } from "@/components/ui/Logo";
import { PageBackground } from "@/components/ui/PageBackground";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { UnreadProvider } from "@/components/dashboard/UnreadProvider";
import { createClient } from "@/lib/supabase/server";
import { getShopUnreadCount } from "@/lib/messages/queries";

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

  const unread = await getShopUnreadCount();

  return (
    <UnreadProvider initialCount={unread} currentUserId={user.id}>
    <Box mih="100vh" bg="var(--mantine-color-body)" style={{ isolation: "isolate" }}>
      <PageBackground />
      {/* Desktop fixed sidebar */}
      <Box
        component="aside"
        visibleFrom="md"
        w={SIDEBAR_WIDTH}
        style={{
          position: "fixed",
          insetBlock: 0,
          left: 0,
          // Frosted nav panel: the aurora softly shows through, and it's separated from the
          // page by a faint hairline + soft shadow (depth) rather than a hard 1px border.
          backgroundColor:
            "light-dark(color-mix(in srgb, var(--mantine-color-white) 70%, transparent), color-mix(in srgb, var(--mantine-color-dark-7) 58%, transparent))",
          backdropFilter: "blur(18px) saturate(140%)",
          WebkitBackdropFilter: "blur(18px) saturate(140%)",
          boxShadow:
            "1px 0 0 0 color-mix(in srgb, var(--mantine-color-default-border) 55%, transparent), 16px 0 32px -28px rgba(0, 0, 0, 0.28)",
        }}
      >
        <Box p="lg">
          <Group justify="space-between" align="center" wrap="nowrap">
            <LinkAnchor href="/dashboard" underline="never" display="inline-flex">
              <Logo />
            </LinkAnchor>
            <Group gap="xs" wrap="nowrap">
              <ThemeToggle />
              <SignOutButton />
            </Group>
          </Group>
        </Box>
        <DashboardNav />
      </Box>

      {/* Mobile top bar + nav (hamburger → Drawer) */}
      <MobileNav />

      <Box
        component="main"
        ml={{ base: 0, md: SIDEBAR_WIDTH }}
        p={{ base: "md", md: "xl" }}
      >
        {children}
      </Box>
    </Box>
    </UnreadProvider>
  );
}
