import { Metadata } from "next";
import { Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { MapPin } from "lucide-react";
import { sampleShops } from "@/lib/catalog/samples";
import { LinkButton } from "@/components/ui/links";

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

      {/* TODO(BE): replace sampleShops with shops read from Supabase */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {sampleShops.map((shop) => (
          <Paper key={shop.id} withBorder radius="lg" p="lg" shadow="xs">
            <Stack gap="sm" h="100%" justify="space-between">
              <div>
                <Title order={4}>{shop.name}</Title>
                <Text c="dimmed" size="sm" mt={4}>
                  {shop.description}
                </Text>
                <Text c="dimmed" size="xs" mt="xs">
                  <MapPin
                    size={12}
                    style={{ display: "inline", verticalAlign: "middle" }}
                  />{" "}
                  {shop.address}
                </Text>
              </div>
              <LinkButton href={`/shop/${shop.id}`} variant="light" fullWidth>
                Vezi magazinul
              </LinkButton>
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    </div>
  );
}
