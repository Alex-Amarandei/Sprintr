"use client";

import { useEffect, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { Clock, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  addShopMember,
  cancelShopInvitation,
  listShopInvitations,
  listShopMembers,
  removeShopMember,
  setShopMemberRole,
  type ShopInvitation,
  type ShopMember,
  type ShopRole,
} from "@/lib/shop/members";

const ROLE_META: Record<ShopRole, { label: string; color: string }> = {
  owner: { label: "Proprietar", color: "brand" },
  catalog: { label: "Catalog", color: "cyan" },
  staff: { label: "Personal", color: "mist" },
};

/** Long labels for the add form. */
const ROLE_OPTIONS = [
  { value: "staff", label: "Personal — comenzi + chat" },
  { value: "catalog", label: "Catalog — + catalog & oferte" },
  { value: "owner", label: "Proprietar — acces complet" },
];
/** Short labels for the inline promote/demote select. */
const ROLE_OPTIONS_SHORT = [
  { value: "staff", label: "Personal" },
  { value: "catalog", label: "Catalog" },
  { value: "owner", label: "Proprietar" },
];

export function MembersManager({
  shopId,
  isOwner,
  currentUserId,
}: {
  shopId: string;
  isOwner: boolean;
  currentUserId: string;
}) {
  const [members, setMembers] = useState<ShopMember[] | null>(null);
  const [invites, setInvites] = useState<ShopInvitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShopRole>("staff");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [m, inv] = await Promise.all([
        listShopMembers(shopId),
        listShopInvitations(shopId),
      ]);
      setMembers(m);
      setInvites(inv);
    } catch (e) {
      toast.error(`Nu am putut încărca echipa: ${(e as Error).message}`);
      setMembers([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  async function add() {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const status = await addShopMember(shopId, email.trim(), role);
      toast.success(
        status === "added"
          ? "Membru adăugat"
          : "Invitație trimisă — se activează la prima conectare cu Google",
      );
      setEmail("");
      setRole("staff");
      await load();
    } catch (e) {
      toast.error((e as Error).message || "Nu am putut adăuga membrul");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(m: ShopMember, next: ShopRole) {
    if (next === m.role) return;
    setBusy(true);
    try {
      await setShopMemberRole(shopId, m.profile_id, next);
      toast.success(`Rol actualizat: ${ROLE_META[next].label}`);
      await load();
    } catch (e) {
      toast.error((e as Error).message || "Nu am putut schimba rolul");
    } finally {
      setBusy(false);
    }
  }

  async function remove(m: ShopMember) {
    setBusy(true);
    try {
      await removeShopMember(shopId, m.profile_id);
      toast.success(`${m.email} eliminat`);
      await load();
    } catch (e) {
      toast.error((e as Error).message || "Nu am putut elimina membrul");
    } finally {
      setBusy(false);
    }
  }

  async function cancelInvite(inv: ShopInvitation) {
    setBusy(true);
    try {
      await cancelShopInvitation(shopId, inv.email);
      toast.success("Invitație anulată");
      await load();
    } catch (e) {
      toast.error((e as Error).message || "Nu am putut anula invitația");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Echipă</Title>
        <Text c="dimmed">
          {isOwner
            ? "Adaugă colegi după email și stabilește-le rolul. Dacă nu au cont încă, invitația se activează la prima conectare."
            : "Membrii magazinului tău."}
        </Text>
      </div>

      {isOwner && (
        <Card>
          <Text fw={700} mb="md">
            Adaugă membru
          </Text>
          <Group align="flex-end" wrap="wrap" gap="sm">
            <TextInput
              label="Email"
              placeholder="coleg@exemplu.ro"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              style={{ flex: 1, minWidth: 220 }}
            />
            <Select
              label="Rol"
              data={ROLE_OPTIONS}
              value={role}
              onChange={(v) => setRole((v as ShopRole) ?? "staff")}
              allowDeselect={false}
              style={{ minWidth: 240 }}
            />
            <Button
              leftSection={<UserPlus size={16} />}
              onClick={add}
              loading={busy}
              disabled={!email.trim()}
            >
              Adaugă
            </Button>
          </Group>
        </Card>
      )}

      <Card>
        <Text fw={700} mb="md">
          Membri
        </Text>
        {members === null ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : members.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            Niciun membru.
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={420}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Membru</Table.Th>
                <Table.Th w={isOwner ? 180 : 140}>Rol</Table.Th>
                {isOwner && <Table.Th w={60} />}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {members.map((m) => (
                <Table.Tr key={m.profile_id}>
                  <Table.Td>
                    <Text fz="sm" fw={600}>
                      {m.full_name || m.email}
                      {m.profile_id === currentUserId && (
                        <Text span c="dimmed" fw={400}>
                          {" "}
                          (tu)
                        </Text>
                      )}
                    </Text>
                    {m.full_name && (
                      <Text fz="xs" c="dimmed">
                        {m.email}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {isOwner ? (
                      <Select
                        size="xs"
                        data={ROLE_OPTIONS_SHORT}
                        value={m.role}
                        allowDeselect={false}
                        disabled={busy}
                        onChange={(v) => v && changeRole(m, v as ShopRole)}
                        w={140}
                      />
                    ) : (
                      <Badge variant="light" color={ROLE_META[m.role].color}>
                        {ROLE_META[m.role].label}
                      </Badge>
                    )}
                  </Table.Td>
                  {isOwner && (
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label="Elimină membrul"
                        disabled={busy}
                        onClick={() => remove(m)}
                      >
                        <Trash2 size={16} />
                      </ActionIcon>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      {invites.length > 0 && (
        <Card>
          <Group gap="xs" mb="md">
            <Clock size={16} />
            <Text fw={700}>Invitații în așteptare</Text>
          </Group>
          <Stack gap="sm">
            {invites.map((inv) => (
              <Group key={inv.email} justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <Text fz="sm" truncate>
                    {inv.email}
                  </Text>
                  <Badge variant="light" color={ROLE_META[inv.role].color} size="sm">
                    {ROLE_META[inv.role].label}
                  </Badge>
                  <Badge variant="light" color="mist" size="sm">
                    În așteptare
                  </Badge>
                </Group>
                {isOwner && (
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label="Anulează invitația"
                    disabled={busy}
                    onClick={() => cancelInvite(inv)}
                  >
                    <Trash2 size={16} />
                  </ActionIcon>
                )}
              </Group>
            ))}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
