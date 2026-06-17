import { Box, Container, Group } from "@mantine/core";
import { LinkAnchor } from "@/components/ui/links";
import { ProfileMenu, LoginIconLink } from "@/components/auth/ProfileMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getViewerIdentity } from "@/lib/auth/identity";
import { getMyNotifications } from "@/lib/notifications/queries";
import { CartProvider } from "@/components/cart/CartContext";
import { CartBar } from "@/components/cart/CartBar";
import { SearchProvider } from "@/components/search/SearchContext";
import { HeaderSearch } from "@/components/search/HeaderSearch";
import { Logo } from "@/components/ui/Logo";
import { PageBackground } from "@/components/ui/PageBackground";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewerIdentity();
  const notifs = viewer ? await getMyNotifications() : { items: [], unread: 0 };
  return (
    <CartProvider>
      <SearchProvider>
      <Box
        mih="100vh"
        bg="var(--mantine-color-body)"
        style={{ display: "flex", flexDirection: "column", isolation: "isolate" }}
      >
        <PageBackground />
        <Box
          component="header"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            // Sit below the notch / status bar when installed as a PWA (0 in a normal browser).
            paddingTop: "env(safe-area-inset-top)",
          }}
        >
          <Container size="lg" h={64}>
            <Group h="100%" justify="space-between" wrap="nowrap">
              <LinkAnchor href="/browse" underline="never" display="inline-flex">
                <Logo />
              </LinkAnchor>
              <HeaderSearch />
              <Group gap="sm" wrap="nowrap">
                <ThemeToggle />
                <CartBar />
                {viewer ? (
                  <>
                    <NotificationBell
                      userId={viewer.id}
                      initialItems={notifs.items}
                      initialUnread={notifs.unread}
                    />
                    <ProfileMenu
                      name={viewer.name}
                      email={viewer.email}
                      avatarUrl={viewer.avatarUrl}
                      hasShopRole={viewer.shops.length > 0}
                    />
                  </>
                ) : (
                  <LoginIconLink />
                )}
              </Group>
            </Group>
          </Container>
        </Box>
        {/* flex:1 pushes the footer to the viewport bottom on short pages (sticky footer). */}
        <Box style={{ flex: 1 }}>
          <Container size="lg" py="xl">
            {children}
          </Container>
        </Box>
        <SiteFooter />
      </Box>
      </SearchProvider>
    </CartProvider>
  );
}
