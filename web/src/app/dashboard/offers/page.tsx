import { Metadata } from "next";
import { Plus } from "lucide-react";
import { Button, Group, Paper, Title } from "@mantine/core";

export const metadata: Metadata = { title: "Oferte" };

export default function ShopOffersPage() {
  return (
    <div>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Oferte</Title>
        <Button leftSection={<Plus size={16} />}>Adaugă ofertă</Button>
      </Group>
      {/* TODO: offers list */}
      <Paper withBorder radius="lg" p={48} ta="center" c="dimmed">
        Nu ai oferte active.
      </Paper>
    </div>
  );
}
