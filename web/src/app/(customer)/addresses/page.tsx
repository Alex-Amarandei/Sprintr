import { Metadata } from "next";
import { Stack, Text, Title } from "@mantine/core";
import { getMyAddresses } from "@/lib/addresses/queries";
import { AddressesManager } from "@/components/account/AddressesManager";

export const metadata: Metadata = { title: "Adresele mele" };

export default async function AddressesPage() {
  const addresses = await getMyAddresses();
  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Adresele mele</Title>
        <Text c="dimmed">Adresele salvate apar la finalizarea comenzii, pentru livrare rapidă.</Text>
      </div>
      <AddressesManager addresses={addresses} />
    </Stack>
  );
}
