import { Metadata } from "next";
import { Paper, SimpleGrid, Text, Title } from "@mantine/core";

export const metadata: Metadata = { title: "Magazine" };

export default function BrowsePage() {
  return (
    <div>
      <Title order={2} mb={4}>
        Magazine în Iași
      </Title>
      <Text c="dimmed" mb="xl">
        Alege un magazin și plasează comanda
      </Text>

      {/* TODO: fetch shops from Supabase */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        <Paper withBorder radius="lg" p="xl" ta="center" c="dimmed">
          Magazinele vor apărea aici
        </Paper>
      </SimpleGrid>
    </div>
  );
}
