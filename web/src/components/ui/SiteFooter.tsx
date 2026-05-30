import Image from "next/image";
import { Box, Container, Group, Text } from "@mantine/core";

/** Branded footer: the logo mark + wordmark + a small note. Reusable across layouts. */
export function SiteFooter() {
  return (
    <Box
      component="footer"
      py="xl"
      mt="xl"
      style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}
    >
      <Container size="lg">
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Group gap={10} align="center" wrap="nowrap">
            <Image src="/logo.svg" alt="SprintR" width={28} height={28} priority />
            <Text fw={700} c="brand.6">
              SprintR
            </Text>
          </Group>
          <Text fz="sm" c="dimmed">
            © 2026 SprintR · Iași
          </Text>
        </Group>
      </Container>
    </Box>
  );
}
