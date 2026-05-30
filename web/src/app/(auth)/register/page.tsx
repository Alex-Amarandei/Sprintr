import { Metadata } from "next";
import { Paper, Stack, Text, Title } from "@mantine/core";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { LinkAnchor } from "@/components/ui/links";

export const metadata: Metadata = { title: "Înregistrare" };

export default function RegisterPage() {
  return (
    <Paper withBorder shadow="sm" radius="lg" p="xl">
      <Title order={2} mb={4}>
        Creează cont
      </Title>
      <Text c="dimmed" mb="lg">
        Folosește contul tău Google — creăm contul automat la prima
        autentificare.
      </Text>

      <Stack gap="md">
        <GoogleSignInButton label="Înregistrează-te cu Google" />
      </Stack>

      <Text ta="center" size="sm" c="dimmed" mt="lg">
        Ai deja cont?{" "}
        <LinkAnchor href="/login" fw={500}>
          Autentifică-te
        </LinkAnchor>
      </Text>
    </Paper>
  );
}
