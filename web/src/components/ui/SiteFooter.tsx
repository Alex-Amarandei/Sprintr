import Image from "next/image";
import { Box, Container, Group, Text } from "@mantine/core";
import { Wordmark } from "@/components/ui/Wordmark";

/** Branded footer: the logo mark + wordmark + a small note. Reusable across layouts. */
export function SiteFooter() {
  return (
    <Box
      component="footer"
      py="xl"
      mt="xl"
      style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}
    >
      <Container size="lg">
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Group gap={10} align="center" wrap="nowrap">
            <Image src="/logo.svg" alt="" width={28} height={28} priority />
            <Wordmark height={22} />
          </Group>
          <Text fz="sm" c="dimmed">
            © 2026 SprintR · Iași
          </Text>
        </Group>
      </Container>
    </Box>
  );
}
