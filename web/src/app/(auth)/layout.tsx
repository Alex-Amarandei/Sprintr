import { Box, Center, Container, Group } from "@mantine/core";
import { LinkAnchor } from "@/components/ui/links";
import { Wordmark } from "@/components/ui/Wordmark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box mih="100vh" bg="var(--mantine-color-body)">
      <Box p="lg">
        <Group justify="space-between" align="center" wrap="nowrap">
          <LinkAnchor href="/" fw={700} fz="xl" c="brand.6" underline="never">
            <Wordmark />
          </LinkAnchor>
          <ThemeToggle />
        </Group>
      </Box>
      <Center px="md" py={48}>
        <Container size={420} w="100%">
          {children}
        </Container>
      </Center>
    </Box>
  );
}
