import { Metadata } from "next";
import { Plus } from "lucide-react";
import { Button, Group, Paper, Title } from "@mantine/core";

export const metadata: Metadata = { title: "Produse" };

export default function ShopProductsPage() {
  return (
    <div>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Produse</Title>
        <Button leftSection={<Plus size={16} />}>Adaugă produs</Button>
      </Group>
      {/* TODO: product grid with Supabase Storage images */}
      <Paper withBorder radius="lg" p={48} ta="center" c="dimmed">
        Nu ai adăugat produse încă.
      </Paper>
    </div>
  );
}
