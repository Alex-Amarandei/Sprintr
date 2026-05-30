"use client";

import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Code,
  Divider,
  Group,
  Menu,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Pencil, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import {
  catalogDocumentSchema,
  parseDocument,
  type CatalogDocument,
  type Item,
  type ItemKind,
} from "@/lib/catalog/schema";
import { newItem } from "@/lib/catalog/factories";
import { createDraft, saveDraftDocument } from "@/lib/catalog/api";
import { ItemCard } from "./ItemCard";

function moveInArray<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Field keys must be unique within an item. Returns an error string or null. */
function findDuplicateKeys(doc: CatalogDocument): string | null {
  for (const item of doc.items) {
    const keys = item.fields.map((f) => f.key);
    const dup = keys.find((k, i) => keys.indexOf(k) !== i);
    if (dup) return `Item „${item.title}" are cheia duplicată: ${dup}`;
  }
  return null;
}

interface Props {
  shopId: string;
  initialDraft: { id: string; version: number; document: unknown } | null;
  activeDocument: CatalogDocument;
  /** Test mode: no Supabase calls — "save" just validates and shows the JSON. */
  localMode?: boolean;
}

export function CatalogBuilder({
  shopId,
  initialDraft,
  activeDocument,
  localMode = false,
}: Props) {
  const [draftId, setDraftId] = useState<string | null>(
    initialDraft?.id ?? (localMode ? "local" : null)
  );
  const [version, setVersion] = useState<number | null>(
    initialDraft?.version ?? (localMode ? 0 : null)
  );
  const [doc, setDoc] = useState<CatalogDocument>(
    initialDraft ? parseDocument(initialDraft.document) : activeDocument
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  const editing = draftId !== null;

  function updateDoc(items: Item[]) {
    setDoc({ ...doc, items });
    setDirty(true);
  }

  async function startEditing() {
    setBusy(true);
    try {
      const draft = await createDraft(shopId);
      setDraftId(draft.id);
      setVersion(draft.version);
      setDoc(parseDocument(draft.document));
      setDirty(false);
      toast.success(`Schiță creată (v${draft.version}) — poți edita catalogul`);
    } catch (e) {
      toast.error(`Nu am putut crea schița: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function addItem(kind: ItemKind) {
    updateDoc([...doc.items, newItem(kind, doc.items.length)]);
  }
  function updateItem(i: number, item: Item) {
    updateDoc(doc.items.map((it, idx) => (idx === i ? item : it)));
  }
  function removeItem(i: number) {
    updateDoc(doc.items.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (!draftId) return;
    // normalize sort_order by position, then validate
    const normalized: CatalogDocument = {
      ...doc,
      items: doc.items.map((it, idx) => ({ ...it, sort_order: idx })),
    };
    const dupErr = findDuplicateKeys(normalized);
    if (dupErr) return toast.error(dupErr);

    const parsed = catalogDocumentSchema.safeParse(normalized);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return toast.error(
        `Document invalid: ${first.path.join(".")} — ${first.message}`
      );
    }

    if (localMode) {
      setDoc(parsed.data);
      setDirty(false);
      console.log("[catalog local mode] document:", parsed.data);
      toast.success("Document valid (mod local — nu a fost trimis la backend)");
      return;
    }

    setBusy(true);
    try {
      await saveDraftDocument(draftId, parsed.data);
      setDoc(parsed.data);
      setDirty(false);
      toast.success("Catalog salvat în schiță");
    } catch (e) {
      toast.error(`Salvarea a eșuat: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>Catalog</Title>
          <Group gap="xs" mt={4}>
            {editing ? (
              <Badge color="yellow" variant="light">
                Editezi schița v{version}
              </Badge>
            ) : (
              <Badge color="gray" variant="light">
                Doar vizualizare (versiunea publicată)
              </Badge>
            )}
            <Text size="sm" c="dimmed">
              {doc.items.length} item(i)
            </Text>
          </Group>
        </div>
        {editing ? (
          <Button
            leftSection={<Save size={16} />}
            onClick={save}
            loading={busy}
            disabled={!dirty}
          >
            Salvează
          </Button>
        ) : (
          <Button
            leftSection={<Pencil size={16} />}
            onClick={startEditing}
            loading={busy}
            variant="default"
          >
            Editează catalogul
          </Button>
        )}
      </Group>

      {!editing && (
        <Alert color="brand" variant="light">
          Vezi catalogul live. Apasă „Editează catalogul" pentru a crea o schiță
          pe care o poți modifica și salva.
        </Alert>
      )}

      {doc.items.length === 0 ? (
        <Paper withBorder radius="lg" p={48} ta="center" c="dimmed">
          {editing
            ? "Niciun item încă. Adaugă primul serviciu sau produs."
            : "Catalogul este gol."}
        </Paper>
      ) : (
        <Stack gap="md">
          {doc.items.map((item, i) =>
            editing ? (
              <ItemCard
                key={item.id}
                item={item}
                onChange={(it) => updateItem(i, it)}
                onRemove={() => removeItem(i)}
                onMoveUp={
                  i > 0
                    ? () => updateDoc(moveInArray(doc.items, i, i - 1))
                    : undefined
                }
                onMoveDown={
                  i < doc.items.length - 1
                    ? () => updateDoc(moveInArray(doc.items, i, i + 1))
                    : undefined
                }
              />
            ) : (
              <Paper key={item.id} withBorder radius="lg" p="md">
                <Group justify="space-between">
                  <Title order={4}>{item.title}</Title>
                  <Badge variant="light">
                    {item.kind === "service" ? "Serviciu" : "Produs"}
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  {item.fields.length} câmpuri · de la {item.base_price} RON
                </Text>
              </Paper>
            )
          )}
        </Stack>
      )}

      {editing && (
        <Menu shadow="md" position="bottom-start">
          <Menu.Target>
            <Button leftSection={<Plus size={16} />} w="fit-content">
              Adaugă item
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item onClick={() => addItem("service")}>Serviciu</Menu.Item>
            <Menu.Item onClick={() => addItem("product")}>Produs</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}

      {localMode && (
        <>
          <Divider
            label="JSON document (live preview — mod local)"
            labelPosition="left"
          />
          <Code
            block
            style={{ maxHeight: 400, overflow: "auto", fontSize: 12 }}
          >
            {JSON.stringify(doc, null, 2)}
          </Code>
        </>
      )}
    </Stack>
  );
}
