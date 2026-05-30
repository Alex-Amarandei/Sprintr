import { Metadata } from "next";
import { Paper, Title } from "@mantine/core";

export const metadata: Metadata = { title: "Comenzile mele" };

export default function CustomerOrdersPage() {
  return (
    <div>
      <Title order={2} mb="lg">
        Comenzile mele
      </Title>
      {/* TODO: fetch orders from Supabase */}
      <Paper withBorder radius="lg" p={48} ta="center" c="dimmed">
        Nu ai comenzi încă.
      </Paper>
    </div>
  );
}
