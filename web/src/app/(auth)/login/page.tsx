import { Metadata } from "next";
import { Divider, Paper, Stack, Text, Title } from "@mantine/core";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export const metadata: Metadata = { title: "Autentificare" };

export default function LoginPage() {
  return (
    <Paper withBorder shadow="sm" radius="lg" p="xl">
      <Title order={2} mb={4}>
        Bun venit la SprintR
      </Title>
      <Text c="dimmed" mb="lg">
        Autentifică-te cu contul tău Google pentru a continua.
      </Text>

      <Stack gap="md">
        <GoogleSignInButton label="Continuă cu Google" />
      </Stack>

      <Divider my="lg" />

      <Text ta="center" size="xs" c="dimmed">
        Prin autentificare ești de acord cu Termenii și Politica de
        confidențialitate SprintR.
      </Text>
    </Paper>
  );
}
