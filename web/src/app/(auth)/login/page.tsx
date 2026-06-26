import { Metadata } from "next";
import { Divider, Paper, Stack, Text, Title } from "@mantine/core";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { LinkAnchor } from "@/components/ui/links";

export const metadata: Metadata = { title: "Autentificare" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <Paper withBorder shadow="md" radius="lg" p="xl">
      <Stack gap="lg">
        <div>
          <Title order={1} fz={28} lh={1.15}>
            Bun venit înapoi
          </Title>
          <Text c="dimmed" mt={6}>
            Autentifică-te cu contul tău Google ca să-ți continui comenzile.
          </Text>
        </div>

        <GoogleSignInButton label="Continuă cu Google" next={next} />

        <Text ta="center" size="sm" c="dimmed">
          Nu ai cont încă?{" "}
          <LinkAnchor href="/register" fw={600} c="brand.6">
            Creează unul
          </LinkAnchor>
        </Text>

        <Divider />

        <Text ta="center" size="xs" c="dimmed">
          Prin autentificare ești de acord cu Termenii și Politica de
          confidențialitate SprintR.
        </Text>
      </Stack>
    </Paper>
  );
}
