import { User } from "lucide-react";
import { Box, Container, Group } from "@mantine/core";
import { LinkAnchor, LinkActionIcon } from "@/components/ui/links";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { CartProvider } from "@/components/cart/CartContext";
import { CartBar } from "@/components/cart/CartBar";
import { SearchProvider } from "@/components/search/SearchContext";
import { HeaderSearch } from "@/components/search/HeaderSearch";
import { Logo } from "@/components/ui/Logo";
import { PageBackground } from "@/components/ui/PageBackground";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <SearchProvider>
      <Box mih="100vh" bg="var(--mantine-color-body)" style={{ isolation: "isolate" }}>
        <PageBackground />
        <Box
          component="header"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
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
                <LinkActionIcon
                  href="/orders"
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label="Profil"
                >
                  <User size={22} />
                </LinkActionIcon>
                <SignOutButton />
              </Group>
            </Group>
          </Container>
        </Box>
        <Container size="lg" py="xl">
          {children}
        </Container>
        <SiteFooter />
      </Box>
      </SearchProvider>
    </CartProvider>
  );
}
