import { Bike, Wallet } from "lucide-react";
import { Box, Container, Group } from "@mantine/core";
import { LinkAnchor, LinkButton } from "@/components/ui/links";
import { Wordmark } from "@/components/ui/Wordmark";

export default function CourierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
        <Container size="sm" h={64}>
          <Group h="100%" justify="space-between">
            <LinkAnchor
              href="/courier/deliveries"
              fw={700}
              fz="xl"
              c="brand.6"
              underline="never"
            >
              <Wordmark />
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
