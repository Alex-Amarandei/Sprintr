import { Metadata } from "next";
import { Paper, Title } from "@mantine/core";

export const metadata: Metadata = { title: "Comenzi primite" };

export default function ShopOrdersPage() {
  return (
    <div>
      <Title order={2} mb="lg">
        Comenzi primite
      </Title>
      {/* TODO: fetch shop orders from Supabase */}
      <Paper withBorder radius="lg" p={48} ta="center" c="dimmed">
        Nu există comenzi deocamdată.
      </Paper>
    </div>
  );
}
