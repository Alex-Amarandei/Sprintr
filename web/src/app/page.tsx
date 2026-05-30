import { redirect } from "next/navigation";
import { Container, Group, Stack, Text, Title } from "@mantine/core";
import { LinkButton } from "@/components/ui/links";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  // Logged-in users skip the marketing landing and go straight into the app,
  // routed by their role.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    redirect(profile?.role === "shop" ? "/dashboard" : "/browse");
  }

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
          <LinkButton href="/login" size="md" variant="outline">
            Autentifică-te
          </LinkButton>
        </Group>
      </Stack>
    </Container>
  );
}
