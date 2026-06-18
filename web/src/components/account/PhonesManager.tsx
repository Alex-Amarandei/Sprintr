"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionIcon, Badge, Button, Card, Group, Stack, Text, TextInput } from "@mantine/core";
import { Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addPhone, deletePhone, setDefaultPhone } from "@/lib/phones/actions";
import { PhoneInput } from "@/components/ui/PhoneInput";
import type { SavedPhone } from "@/lib/phones/queries";

export function PhonesManager({ phones }: { phones: SavedPhone[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(false);

  async function add() {
    setPending(true);
    const res = await addPhone({ label, phone, makeDefault: phones.length === 0 });
    setPending(false);
    if (res.ok) {
      toast.success("Număr salvat");
      setLabel("");
      setPhone("");
      router.refresh();
    } else {
      toast.error(res.error ?? "Nu am putut salva numărul");
    }
  }

  async function remove(id: string) {
    await deletePhone(id);
    router.refresh();
  }
  async function makeDefault(id: string) {
    await setDefaultPhone(id);
    router.refresh();
  }

  return (
    <Stack gap="lg">
      <Card withBorder radius="lg">
        <Text fw={700} mb="sm">
          Adaugă un număr
        </Text>
        <Stack gap="sm">
          <TextInput
            label="Etichetă (opțional)"
            placeholder="Personal, Birou…"
            value={label}
            onChange={(e) => setLabel(e.currentTarget.value)}
          />
          <PhoneInput label="Număr de telefon" value={phone} onChange={setPhone} />
          <Group justify="flex-end">
            <Button loading={pending} disabled={!phone.trim()} onClick={add}>
              Salvează numărul
            </Button>
          </Group>
        </Stack>
      </Card>

      {phones.length > 0 && (
        <Stack gap="sm">
          {phones.map((p) => (
            <Card key={p.id} withBorder radius="lg">
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <Phone size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ minWidth: 0 }}>
                    <Group gap={6}>
                      {p.label && (
                        <Text fw={600} fz="sm">
                          {p.label}
                        </Text>
                      )}
                      {p.isDefault && (
                        <Badge size="xs" color="brand" variant="light">
                          Implicit
                        </Badge>
                      )}
                    </Group>
                    <Text fz="sm" c="dimmed">
                      {p.phone}
                    </Text>
                  </div>
                </Group>
                <Group gap="xs" wrap="nowrap">
                  {!p.isDefault && (
                    <Button variant="subtle" size="compact-xs" onClick={() => makeDefault(p.id)}>
                      Setează ca implicit
                    </Button>
                  )}
                  <ActionIcon variant="subtle" color="red" onClick={() => remove(p.id)} aria-label="Șterge numărul">
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
