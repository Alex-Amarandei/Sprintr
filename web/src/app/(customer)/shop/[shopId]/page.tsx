import { Metadata } from "next";
import { Paper, Text } from "@mantine/core";

export const metadata: Metadata = { title: "Magazin" };

interface Props {
  params: Promise<{ shopId: string }>;
}

export default async function ShopDetailPage({ params }: Props) {
  const { shopId } = await params;

  return (
    <div>
      <Text c="dimmed" size="sm" mb="lg">
        Shop ID: {shopId}
      </Text>
      {/* TODO: fetch shop details, services and products from Supabase */}
      <Paper withBorder radius="lg" p={48} ta="center" c="dimmed">
        Detaliile magazinului vor apărea aici.
      </Paper>
    </div>
  );
}
