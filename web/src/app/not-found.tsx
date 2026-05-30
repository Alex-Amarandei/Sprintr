import { Container, Stack, Text, Title } from "@mantine/core";
import { LinkButton } from "@/components/ui/links";

export default function NotFound() {
  return (
    <Container
      size="sm"
      h="100vh"
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <Stack align="center" gap="md">
        <Title order={1} c="brand.5" style={{ fontSize: "5rem" }}>
          404
        </Title>
        <Text size="xl" c="dimmed">
          Pagina nu a fost găsită.
        </Text>
        <LinkButton href="/" size="md">
          Înapoi acasă
        </LinkButton>
      </Stack>
    </Container>
  );
}
