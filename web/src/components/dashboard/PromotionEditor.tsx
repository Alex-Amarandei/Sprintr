"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { LinkButton } from "@/components/ui/links";

type PromoType = "percent" | "fixed" | "bxgy";
const TYPE_LABEL: Record<PromoType, string> = {
  percent: "Procent",
  fixed: "Sumă fixă",
  bxgy: "Cumpără X, primești Y",
};

export function PromotionEditor() {
  const router = useRouter();
  const [type, setType] = useState<PromoType>("percent");
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState(10);
  const [amount, setAmount] = useState(10);
  const [buyX, setBuyX] = useState(2);
  const [getY, setGetY] = useState(1);
  const [scope, setScope] = useState<string | null>("order");
  const [permanent, setPermanent] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [active, setActive] = useState(true);

  function save() {
    if (!title.trim() || !code.trim()) {
      toast.error("Completează titlul și codul promoției.");
      return;
    }
    // TODO(BE): insert into the offers table.
    toast.success("Promoție creată");
    router.push("/dashboard/offers");
  }

  const valuePreview =
    type === "percent" ? `−${percent}%` : type === "fixed" ? `−${amount} lei` : `${buyX}+${getY}`;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
        <div>
          <Title order={2}>Promoție nouă</Title>
          <Text c="dimmed">Atrage clienți cu o reducere sau o ofertă.</Text>
        </div>
        <Group>
          <LinkButton href="/dashboard/offers" variant="default" color="stone.1">
            Anulează
          </LinkButton>
          <Button leftSection={<Check size={16} />} onClick={save}>
            Salvează
          </Button>
        </Group>
      </Group>

      <Group align="flex-start" gap="lg" wrap="nowrap">
        <Stack gap="lg" style={{ flex: 1, minWidth: 0 }}>
          <Card>
            <Text fw={700} mb="md">
              Tip promoție
            </Text>
            <SegmentedControl
              fullWidth
              value={type}
              onChange={(v) => setType(v as PromoType)}
              data={[
                { value: "percent", label: "Procent" },
                { value: "fixed", label: "Sumă fixă" },
                { value: "bxgy", label: "Cumpără X, primești Y" },
              ]}
            />
            <Group grow mt="md" align="flex-start">
              {type === "percent" && (
                <NumberInput label="Procent reducere (%)" min={1} max={100} value={percent} onChange={(v) => setPercent(typeof v === "number" ? v : 0)} />
              )}
              {type === "fixed" && (
                <NumberInput label="Sumă reducere (lei)" min={1} value={amount} onChange={(v) => setAmount(typeof v === "number" ? v : 0)} />
              )}
              {type === "bxgy" && (
                <>
                  <NumberInput label="Cumpără (X)" min={1} value={buyX} onChange={(v) => setBuyX(typeof v === "number" ? v : 1)} />
                  <NumberInput label="Primești gratuit (Y)" min={1} value={getY} onChange={(v) => setGetY(typeof v === "number" ? v : 1)} />
                </>
              )}
              <Select
                label="Se aplică la"
                allowDeselect={false}
                data={[
                  { value: "order", label: "Toată comanda" },
                  { value: "item", label: "Per produs" },
                ]}
                value={scope}
                onChange={setScope}
              />
            </Group>
          </Card>

          <Card>
            <Text fw={700} mb="md">
              Detalii
            </Text>
            <Stack gap="sm">
              <TextInput
                label="Titlu"
                placeholder="10% reducere la lucrări de licență"
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)}
              />
              <TextInput
                label="Cod promoțional"
                placeholder="STUDENT10"
                value={code}
                onChange={(e) => setCode(e.currentTarget.value.toUpperCase().replace(/\s/g, ""))}
              />
              <Switch label="Permanentă" checked={permanent} onChange={(e) => setPermanent(e.currentTarget.checked)} />
              {!permanent && (
                <Group grow>
                  <TextInput label="De la" placeholder="01 Dec" value={from} onChange={(e) => setFrom(e.currentTarget.value)} />
                  <TextInput label="Până la" placeholder="07 Dec" value={to} onChange={(e) => setTo(e.currentTarget.value)} />
                </Group>
              )}
              <Switch label="Activă" checked={active} onChange={(e) => setActive(e.currentTarget.checked)} />
            </Stack>
          </Card>
        </Stack>

        {/* Live preview */}
        <Box w={320} visibleFrom="md" style={{ flexShrink: 0 }}>
          <Text tt="uppercase" fz="xs" fw={700} c="brand.6" mb="sm" style={{ letterSpacing: 0.6 }}>
            Previzualizare
          </Text>
          <Paper withBorder radius="md" p="sm">
            <Group gap={6} mb={4}>
              <Badge variant="light" color="brand" size="sm">
                {TYPE_LABEL[type]}
              </Badge>
              <Badge variant="light" color={active ? "teal" : "mist"} size="sm">
                {active ? "Activă" : "Inactivă"}
              </Badge>
              {code && (
                <Badge variant="outline" color="brand" size="sm">
                  {code}
                </Badge>
              )}
            </Group>
            <Text fw={600} fz="sm">
              {title || "Titlu promoție"}
            </Text>
            <Text fz="xs" c="dimmed">
              {permanent ? "Permanent" : `${from || "?"}–${to || "?"}`} · {valuePreview}
            </Text>
          </Paper>
        </Box>
      </Group>
    </Stack>
  );
}
