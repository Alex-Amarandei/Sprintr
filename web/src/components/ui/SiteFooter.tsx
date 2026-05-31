import { Box, Container, Group, Text } from "@mantine/core";
import { Wordmark } from "@/components/ui/Wordmark";
import { LinkAnchor } from "@/components/ui/links";

/** Branded footer: wordmark, copyright, and legal links. Reusable across layouts. */
export function SiteFooter() {
  return (
    <Box
      component="footer"
      style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}
    >
      <Container size="lg" py="lg">
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Group gap="md" align="center" wrap="wrap">
            <Wordmark height={22} />
            <Text fz="sm" c="dimmed">
              © 2026 SprintR · Iași
            </Text>
          </Group>
          <Group gap="lg" wrap="wrap">
            <LinkAnchor href="/terms" c="dimmed" fz="sm" underline="hover">
              Termeni și condiții
            </LinkAnchor>
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
