import { Search, User } from "lucide-react";
import { Box, Container, Group, TextInput } from "@mantine/core";
import { LinkAnchor, LinkActionIcon } from "@/components/ui/links";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { CartProvider } from "@/components/cart/CartContext";
import { CartBar } from "@/components/cart/CartBar";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Wordmark } from "@/components/ui/Wordmark";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <Box mih="100vh" bg="gray.0">
        <Box
          component="header"
          bg="white"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            borderBottom: "1px solid var(--mantine-color-gray-2)",
          }}
        >
          <Container size="lg" h={64}>
            <Group h="100%" justify="space-between" wrap="nowrap">
              <LinkAnchor
                href="/browse"
                fw={700}
                fz="xl"
                c="brand.6"
                underline="never"
              >
                <Wordmark />
              </LinkAnchor>
              <TextInput
                flex={1}
                maw={420}
              visibleFrom="sm"
                mx="md"
                placeholder="Caută magazine sau servicii..."
                leftSection={<Search size={16} />}
              />
              <Group gap="sm" wrap="nowrap">
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
    </CartProvider>
  );
}
