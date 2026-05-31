import { Bike, Wallet } from "lucide-react";
import { Box, Container, Group } from "@mantine/core";
import { LinkAnchor, LinkButton } from "@/components/ui/links";
import { Logo } from "@/components/ui/Logo";
import { PageBackground } from "@/components/ui/PageBackground";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function CourierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
        <Container size="sm" h={64}>
          <Group h="100%" justify="space-between">
            <LinkAnchor
              href="/courier/deliveries"
              underline="never"
              display="inline-flex"
            >
              <Logo />
            </LinkAnchor>
            <Group gap="xs">
              <LinkButton
                href="/courier/deliveries"
                variant="subtle"
                color="gray"
                leftSection={<Bike size={18} />}
              >
                Livrări
              </LinkButton>
              <LinkButton
                href="/courier/earnings"
                variant="subtle"
                color="gray"
                leftSection={<Wallet size={18} />}
              >
                Câștiguri
              </LinkButton>
              <ThemeToggle />
            </Group>
          </Group>
        </Container>
      </Box>
      <Container size="sm" py="xl">
        {children}
      </Container>
    </Box>
  );
}
