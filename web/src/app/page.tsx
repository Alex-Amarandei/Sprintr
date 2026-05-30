import { Container, Group, Stack, Text, Title } from "@mantine/core";
import { LinkButton } from "@/components/ui/links";

export default function HomePage() {
  return (
    <Container
      size="sm"
      h="100vh"
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <Stack align="center" gap="lg">
        <Title order={1} c="brand.6" style={{ fontSize: "3.5rem" }}>
          SprintR
        </Title>
        <Text size="xl" c="dimmed" ta="center">
          Papetărie, printare și produse de birou livrate rapid în Iași.
        </Text>
        <Group>
          <LinkButton href="/browse" size="md">
            Comandă acum
          </LinkButton>
          <LinkButton href="/register" size="md" variant="outline">
            Înregistrează-te
          </LinkButton>
        </Group>
      </Stack>
    </Container>
  );
}
