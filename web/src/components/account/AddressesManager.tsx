"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionIcon, Badge, Button, Card, Group, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addAddress, deleteAddress, setDefaultAddress } from "@/lib/addresses/actions";
import type { SavedAddress } from "@/lib/addresses/queries";

export function AddressesManager({ addresses }: { addresses: SavedAddress[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [pending, setPending] = useState(false);

  async function add() {
    setPending(true);
    const res = await addAddress({ label, address, makeDefault: addresses.length === 0 });
    setPending(false);
    if (res.ok) {
      toast.success("Adresă salvată");
      setLabel("");
      setAddress("");
      router.refresh();
    } else {
      toast.error(res.error ?? "Nu am putut salva adresa");
    }
  }

  async function remove(id: string) {
    await deleteAddress(id);
    router.refresh();
  }
  async function makeDefault(id: string) {
    await setDefaultAddress(id);
    router.refresh();
  }

  return (
    <Stack gap="lg">
      <Card withBorder radius="lg">
        <Text fw={700} mb="sm">
          Adaugă o adresă
        </Text>
        <Stack gap="sm">
          <TextInput
            label="Etichetă (opțional)"
            placeholder="Acasă, Birou…"
            value={label}
            onChange={(e) => setLabel(e.currentTarget.value)}
          />
          <Textarea
            label="Adresă"
            placeholder="Str. Lăpușneanu 12, Iași"
            autosize
            minRows={2}
            value={address}
            onChange={(e) => setAddress(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button loading={pending} disabled={!address.trim()} onClick={add}>
              Salvează adresa
            </Button>
          </Group>
        </Stack>
      </Card>

      {addresses.length > 0 && (
        <Stack gap="sm">
          {addresses.map((a) => (
            <Card key={a.id} withBorder radius="lg">
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <MapPin size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ minWidth: 0 }}>
                    <Group gap={6}>
                      {a.label && (
                        <Text fw={600} fz="sm">
                          {a.label}
                        </Text>
                      )}
                      {a.isDefault && (
                        <Badge size="xs" color="brand" variant="light">
                          Implicită
                        </Badge>
                      )}
                    </Group>
                    <Text fz="sm" c="dimmed">
                      {a.address}
                    </Text>
                  </div>
                </Group>
                <Group gap="xs" wrap="nowrap">
                  {!a.isDefault && (
                    <Button variant="subtle" size="compact-xs" onClick={() => makeDefault(a.id)}>
                      Implicită
                    </Button>
                  )}
                  <ActionIcon variant="subtle" color="red" onClick={() => remove(a.id)} aria-label="Șterge adresa">
                    <Trash2 size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
