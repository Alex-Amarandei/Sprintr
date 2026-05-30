import { Metadata } from "next";
import { Paper, Title } from "@mantine/core";

export const metadata: Metadata = { title: "Câștiguri" };

export default function EarningsPage() {
  return (
    <div>
      <Title order={2} mb="lg">
        Câștiguri
      </Title>
      <Paper withBorder radius="lg" p={48} ta="center" c="dimmed">
        Istoricul câștigurilor va apărea aici.
      </Paper>
    </div>
  );
}
