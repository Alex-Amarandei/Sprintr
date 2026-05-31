import { Box, Container, Group, Text } from "@mantine/core";
import { Wordmark } from "@/components/ui/Wordmark";

/** Branded footer: the wordmark + a small note. Reusable across layouts. */
export function SiteFooter() {
  return (
    <Box component="footer" py="xl" mt="xl">
      <Container size="lg">
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Wordmark height={22} />
          <Text fz="sm" c="dimmed">
            © 2026 SprintR · Iași
          </Text>
        </Group>
      </Container>
    </Box>
  );
}
