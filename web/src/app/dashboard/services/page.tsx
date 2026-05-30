import { Metadata } from "next";
import { Plus } from "lucide-react";
import { Button, Group, Paper, Title } from "@mantine/core";

export const metadata: Metadata = { title: "Servicii" };

export default function ShopServicesPage() {
  return (
    <div>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Servicii</Title>
        <Button leftSection={<Plus size={16} />}>Adaugă serviciu</Button>
      </Group>
      {/* TODO: list services with service option builder */}
      <Paper withBorder radius="lg" p={48} ta="center" c="dimmed">
        Nu ai adăugat servicii încă. Adaugă servicii pentru a permite clienților
        să comande.
      </Paper>
    </div>
  );
}
