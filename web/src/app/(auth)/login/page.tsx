import { Metadata } from "next";
import {
  Button,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { LinkAnchor } from "@/components/ui/links";

export const metadata: Metadata = { title: "Autentificare" };

export default function LoginPage() {
  return (
    <Paper withBorder shadow="sm" radius="lg" p="xl">
      <Title order={2} mb={4}>
        Bun venit înapoi
      </Title>
      <Text c="dimmed" mb="lg">
        Autentifică-te în contul tău SprintR
      </Text>

      <form>
        <Stack gap="md">
          <TextInput
            label="Email"
            type="email"
            placeholder="email@exemplu.com"
            required
          />
          <PasswordInput label="Parolă" placeholder="••••••••" required />
          <Group justify="flex-end">
            <LinkAnchor href="/forgot-password" size="sm">
              Ai uitat parola?
            </LinkAnchor>
          </Group>
          <Button type="submit" fullWidth>
            Autentifică-te
          </Button>
        </Stack>
      </form>

      <Text ta="center" size="sm" c="dimmed" mt="lg">
        Nu ai cont?{" "}
        <LinkAnchor href="/register" fw={500}>
          Înregistrează-te
        </LinkAnchor>
      </Text>
    </Paper>
  );
}
