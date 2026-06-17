import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Avatar, Card, Group, Stack, Text, Title } from "@mantine/core";
import { getViewerIdentity } from "@/lib/auth/identity";
import { getMyAddresses } from "@/lib/addresses/queries";
import { getMyPhones } from "@/lib/phones/queries";
import { AddressesManager } from "@/components/account/AddressesManager";
import { PhonesManager } from "@/components/account/PhonesManager";
import { initials } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Profilul meu" };

export default async function AccountPage() {
  const [me, addresses, phones] = await Promise.all([
    getViewerIdentity(),
    getMyAddresses(),
    getMyPhones(),
  ]);
  if (!me) redirect("/login");

  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Profilul meu</Title>
        <Text c="dimmed">
          Datele salvate aici se completează automat la finalizarea comenzii, pentru livrare rapidă.
        </Text>
      </div>

      <Card withBorder radius="lg">
        <Group gap="md" wrap="nowrap">
          <Avatar
            src={me.avatarUrl ?? undefined}
            size={56}
            radius="xl"
            color="brand"
            imageProps={{ referrerPolicy: "no-referrer" }}
          >
            {initials(me.name)}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Text fw={700} truncate>
              {me.name}
            </Text>
            <Text fz="sm" c="dimmed" truncate>
              {me.email}
            </Text>
          </div>
        </Group>
      </Card>

      <Stack gap="md">
        <Title order={3} fz="lg">
          Adrese de livrare
        </Title>
        <AddressesManager addresses={addresses} />
      </Stack>

      <Stack gap="md">
        <Title order={3} fz="lg">
          Numere de telefon
        </Title>
        <PhonesManager phones={phones} />
      </Stack>
    </Stack>
  );
}
