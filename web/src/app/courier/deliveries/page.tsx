import { Metadata } from "next";
import { Paper, Title } from "@mantine/core";

export const metadata: Metadata = { title: "Livrările mele" };

export default function DeliveriesPage() {
  return (
    <div>
      <Title order={2} mb="lg">
        Livrări disponibile
      </Title>
      {/* TODO: available delivery jobs */}
      <Paper withBorder radius="lg" p={48} ta="center" c="dimmed">
        Nu există livrări disponibile momentan.
      </Paper>
    </div>
  );
}
