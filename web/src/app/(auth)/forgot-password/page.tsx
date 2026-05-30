import { Metadata } from "next";
import { Button, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { LinkAnchor } from "@/components/ui/links";

export const metadata: Metadata = { title: "Resetare parolă" };

export default function ForgotPasswordPage() {
  return (
    <Paper withBorder shadow="sm" radius="lg" p="xl">
      <Title order={2} mb={4}>
        Resetează parola
      </Title>
      <Text c="dimmed" mb="lg">
        Introdu adresa de email și îți vom trimite un link de resetare.
      </Text>

      <form>
        <Stack gap="md">
          <TextInput
            label="Email"
            type="email"
            placeholder="email@exemplu.com"
            required
          />
          <Button type="submit" fullWidth>
            Trimite link de resetare
          </Button>
        </Stack>
      </form>

      <Text ta="center" size="sm" mt="lg">
        <LinkAnchor href="/login">Înapoi la autentificare</LinkAnchor>
      </Text>
    </Paper>
  );
}
