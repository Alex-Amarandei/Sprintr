import { Metadata } from "next";
import { Paper, Title } from "@mantine/core";

export const metadata: Metadata = { title: "Detalii comandă" };

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function OrderDetailPage({ params }: Props) {
  const { orderId } = await params;

  return (
    <div>
      <Title order={2} mb="lg">
        Comanda #{orderId.slice(0, 8)}
      </Title>
      {/* TODO: fetch order details from Supabase */}
      <Paper withBorder radius="lg" p={48} ta="center" c="dimmed">
        Detaliile comenzii vor apărea aici.
      </Paper>
    </div>
  );
}
