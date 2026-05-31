import { Metadata } from "next";
import { Divider, Paper, Stack, Text, Title } from "@mantine/core";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { LinkAnchor } from "@/components/ui/links";

export const metadata: Metadata = { title: "Înregistrare" };

export default function RegisterPage() {
  return (
    <Paper withBorder shadow="md" radius="lg" p="xl">
      <Stack gap="lg">
        <div>
          <Title order={1} fz={28} lh={1.15}>
            Creează-ți cont
          </Title>
          <Text c="dimmed" mt={6}>
            Folosește contul tău Google — îl creăm automat la prima
            autentificare.
          </Text>
        </div>

        <GoogleSignInButton label="Înregistrează-te cu Google" />

        <Text ta="center" size="sm" c="dimmed">
          Ai deja cont?{" "}
          <LinkAnchor href="/login" fw={600} c="brand.6">
            Autentifică-te
          </LinkAnchor>
        </Text>

        <Divider />

        <Text ta="center" size="xs" c="dimmed">
          Prin crearea contului ești de acord cu Termenii și Politica de
          confidențialitate SprintR.
        </Text>
      </Stack>
    </Paper>
  );
}
