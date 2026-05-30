import { Metadata } from "next";
import {
  Button,
  Paper,
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { LinkAnchor } from "@/components/ui/links";

export const metadata: Metadata = { title: "Înregistrare" };

export default function RegisterPage() {
  return (
    <Paper withBorder shadow="sm" radius="lg" p="xl">
      <Title order={2} mb={4}>
        Creează cont
      </Title>
      <Text c="dimmed" mb="lg">
        Alătură-te comunității SprintR
      </Text>

      <form>
        <Stack gap="md">
          <TextInput label="Nume complet" placeholder="Ion Ionescu" required />
          <TextInput
            label="Email"
            type="email"
            placeholder="email@exemplu.com"
            required
          />
          <TextInput label="Telefon" type="tel" placeholder="07xx xxx xxx" />
          <Select
            label="Tip cont"
            defaultValue="customer"
            data={[
              { value: "customer", label: "Client" },
              { value: "shop", label: "Proprietar magazin" },
            ]}
            allowDeselect={false}
          />
          <PasswordInput
            label="Parolă"
            placeholder="Minim 8 caractere"
            required
          />
          <Button type="submit" fullWidth>
            Creează cont
          </Button>
        </Stack>
      </form>

      <Text ta="center" size="sm" c="dimmed" mt="lg">
        Ai deja cont?{" "}
        <LinkAnchor href="/login" fw={500}>
          Autentifică-te
        </LinkAnchor>
      </Text>
    </Paper>
  );
}
