"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDisclosure } from "@mantine/hooks";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Code,
  Divider,
  Group,
  Menu,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  AlertCircle,
  ArrowUp,
  GripVertical,
  Pencil,
  Plus,
  Rocket,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  catalogDocumentSchema,
  parseDocument,
  TEXT_MAX,
  type CatalogDocument,
  type Category,
  type Item,
  type ItemKind,
} from "@/lib/catalog/schema";
import { newCategory, newItem } from "@/lib/catalog/factories";
import { isLocalImage, persistLocalImage } from "@/lib/catalog/images";
import {
  getOrCreateDraft,
  publishVersion,
  saveDraftDocument,
} from "@/lib/catalog/api";
import { roCount } from "@/lib/utils/format";
import { ItemCard } from "./ItemCard";
import { ProductItemCard } from "./ProductItemCard";
import { ItemReadOnlyCard } from "./ItemReadOnlyCard";
import { CatalogVersions } from "./CatalogVersions";

/** An ItemCard wrapped as a dnd-kit sortable, with its own drag handle. */
function SortableItemCard({
  item,
  categories,
  onChange,
  onRemove,
}: {
  item: Item;
  categories: Category[];
  onChange: (it: Item) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 2 : undefined,
  };
  const handle = (
    <ActionIcon
      variant="subtle"
      color="gray"
      size="lg"
      style={{ cursor: "grab" }}
      aria-label="Trage pentru reordonare"
      {...attributes}
      {...listeners}
    >
      <GripVertical size={18} />
    </ActionIcon>
  );
  // Products are standalone (not configurable) → a compact card; services get the
  // full field configurator.
  const Card = item.kind === "product" ? ProductItemCard : ItemCard;
  return (
    <div ref={setNodeRef} style={style}>
      <Card
        item={item}
        categories={categories}
        onChange={onChange}
        onRemove={onRemove}
        dragHandle={handle}
      />
    </div>
  );
}

/**
 * A category section — an editable header + a droppable area holding its items.
 * Items can be dragged in/out across sections. `categoryId === null` = uncategorized.
 */
function CategorySection({
  categoryId,
  name,
  items,
  categories,
  kind,
  onRename,
  onDelete,
  onAddItem,
  onItemChange,
  onItemRemove,
}: {
  categoryId: string | null;
  name: string;
  items: Item[];
  categories: Category[];
  /** When set, the section adds only this kind (single button instead of a menu). */
  kind?: ItemKind;
  onRename?: (name: string) => void;
  onDelete?: () => void;
  onAddItem?: (kind: ItemKind) => void;
  onItemChange: (id: string, it: Item) => void;
  onItemRemove: (id: string) => void;
}) {
  const droppableId = `cat:${categoryId ?? "none"}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  const isUncat = categoryId === null;
  const copy = KIND_COPY[kind ?? "both"];

  return (
    <Paper
      withBorder
      radius="lg"
      p="md"
      style={{
        // Grouping shell with a faint blur-free tint — subtle enough that the page background
        // still reads through, but defined enough to bound the category. The frosted item cards
        // inside stand on their own. A drag hovering the drop zone tints it brand.
        background: isOver
          ? "color-mix(in srgb, var(--mantine-color-brand-5) 12%, transparent)"
          : "light-dark(color-mix(in srgb, var(--mantine-color-stone-1) 16%, transparent), color-mix(in srgb, var(--mantine-color-dark-8) 18%, transparent))",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
        borderColor: isOver ? "var(--mantine-color-brand-4)" : undefined,
        transition: "background 120ms, border-color 120ms",
      }}
    >
      <Group justify="space-between" wrap="nowrap" mb="sm">
        {isUncat ? (
          <Text fw={700} c="dimmed">
            Fără categorie
          </Text>
        ) : (
          <TextInput
            variant="unstyled"
            placeholder="Nume categorie"
            maxLength={TEXT_MAX}
            value={name}
            onChange={(e) => onRename?.(e.currentTarget.value)}
            styles={{
              input: {
                fontWeight: 700,
                fontSize: "var(--mantine-font-size-md)",
              },
            }}
            style={{ flex: 1 }}
          />
        )}
        <Group gap="xs" wrap="nowrap">
          <Text fz="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
            {roCount(items.length, copy.one, copy.many)}
          </Text>
          {!isUncat &&
            (kind ? (
              <Button
                variant="light"
                size="xs"
                leftSection={<Plus size={14} />}
                onClick={() => onAddItem?.(kind)}
              >
                Adaugă
              </Button>
            ) : (
              <Menu shadow="md" position="bottom-end">
                <Menu.Target>
                  <Button
                    variant="light"
                    size="xs"
                    leftSection={<Plus size={14} />}
                  >
                    Adaugă
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item onClick={() => onAddItem?.("service")}>
                    Serviciu
                  </Menu.Item>
                  <Menu.Item onClick={() => onAddItem?.("product")}>
                    Produs
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ))}
          {!isUncat && (
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={onDelete}
              aria-label="Șterge categoria"
            >
              <Trash2 size={16} />
            </ActionIcon>
          )}
        </Group>
      </Group>

      <div ref={setNodeRef}>
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <Stack gap="sm">
            {items.map((item) => (
              <SortableItemCard
                key={item.id}
                item={item}
                categories={categories}
                onChange={(it) => onItemChange(item.id, it)}
                onRemove={() => onItemRemove(item.id)}
              />
            ))}
            {items.length === 0 && (
              <Text fz="sm" c="dimmed" ta="center" py="md">
                {copy.drop}
              </Text>
            )}
          </Stack>
        </SortableContext>
      </div>
    </Paper>
  );
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
  /** The shop's live version pointer — drives the "Live" marker in the history. */
  activeVersionId?: string | null;
  /**
   * Restrict the builder to a single kind (Servicii page vs Produse page). The full
   * document is still held + saved (so the other kind is preserved); only the views,
   * the add action, and the counts are scoped. Omit to manage both kinds at once.
   */
  kind?: ItemKind;
  /** Whether the caller may edit (role catalog/owner). `staff` → view-only. */
  canEdit?: boolean;
  /** Test mode: no Supabase calls — "save" just validates and shows the JSON. */
  localMode?: boolean;
}

const KIND_COPY = {
  service: { heading: "Servicii", add: "Adaugă serviciu", one: "serviciu", many: "servicii", drop: "Trage servicii aici", empty: "Niciun serviciu încă." },
  product: { heading: "Produse", add: "Adaugă produs", one: "produs", many: "produse", drop: "Trage produse aici", empty: "Niciun produs încă." },
  both: { heading: "Catalog", add: "Adaugă item", one: "element", many: "elemente", drop: "Trage produse aici", empty: "Catalogul este gol." },
} as const;

export function CatalogBuilder({
  shopId,
  initialDraft,
  activeDocument,
  activeVersionId = null,
  kind,
  canEdit = true,
  localMode = false,
}: Props) {
  const copy = KIND_COPY[kind ?? "both"];
  const inScope = (it: Item) => !kind || it.kind === kind;
  const router = useRouter();
  const [draftId, setDraftId] = useState<string | null>(
    initialDraft?.id ?? (localMode ? "local" : null),
  );
  const [version, setVersion] = useState<number | null>(
    initialDraft?.version ?? (localMode ? 0 : null),
  );
  const [doc, setDoc] = useState<CatalogDocument>(
    initialDraft ? parseDocument(initialDraft.document) : activeDocument,
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [liveId, setLiveId] = useState<string | null>(activeVersionId);
  // "Ești sigur?" confirm before discarding unsaved edits on "Renunță".
  const [confirmOpen, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);

  const editing = canEdit && draftId !== null;

  // "Changes to publish" = the working document differs from the live version. Stays true
  // after a plain Save (the saved draft still isn't live) and false right after entering edit
  // (the draft is a clone of live) or once edits are reverted — so Publică disables when a
  // publish would be a no-op. sort_order is normalized so reorders count but index noise doesn't.
  const hasUnpublishedChanges = useMemo(() => {
    const canonical = (d: CatalogDocument) =>
      JSON.stringify({ ...d, items: d.items.map((it, i) => ({ ...it, sort_order: i })) });
    return canonical(doc) !== canonical(activeDocument);
  }, [doc, activeDocument]);

  function updateDoc(items: Item[]) {
    setDoc({ ...doc, items });
    setDirty(true);
  }

  async function startEditing() {
    setBusy(true);
    try {
      // Reuse the shop's existing draft if one exists, else clone the live version into a
      // fresh one — so leaving edit mode and coming back doesn't create duplicate drafts.
      const draft = await getOrCreateDraft(shopId);
      setDraftId(draft.id);
      setVersion(draft.version);
      setDoc(parseDocument(draft.document));
      setDirty(false);
      toast.success(`Poți edita catalogul — schița v${draft.version}`);
    } catch (e) {
      toast.error(`Nu am putut deschide schița: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Leave edit mode without publishing — back to the read-only live catalog. The draft is
   * kept in the DB (re-entering edit resumes it); only unsaved in-memory edits are dropped.
   * With unsaved edits we ask for confirmation first (modal); otherwise we exit straight away.
   */
  function requestCancelEditing() {
    if (dirty) openConfirm();
    else doCancelEditing();
  }
  function doCancelEditing() {
    closeConfirm();
    setDraftId(null);
    setVersion(null);
    setDoc(activeDocument);
    setDirty(false);
  }

  function addItem(kind: ItemKind, categoryId: string | null = null) {
    // Prepend so the new (empty, auto-expanded) card lands at the top of its section
    // instead of off-screen at the bottom. sort_order is re-normalized on save.
    updateDoc([
      { ...newItem(kind, 0), category_id: categoryId },
      ...doc.items,
    ]);
  }
  const updateItemById = (id: string, item: Item) =>
    updateDoc(doc.items.map((it) => (it.id === id ? item : it)));
  const removeItemById = (id: string) =>
    updateDoc(doc.items.filter((it) => it.id !== id));

  function setCategories(categories: Category[]) {
    // Clear references to deleted categories from items.
    const ids = new Set(categories.map((c) => c.id));
    const items = doc.items.map((it) =>
      it.category_id && !ids.has(it.category_id)
        ? { ...it, category_id: null }
        : it,
    );
    setDoc({ ...doc, categories, items });
    setDirty(true);
  }
  const addCategory = () =>
    setCategories([...doc.categories, newCategory("", doc.categories.length)]);
  const renameCategory = (id: string, name: string) =>
    setCategories(
      doc.categories.map((c) => (c.id === id ? { ...c, name } : c)),
    );
  const deleteCategory = (id: string) =>
    setCategories(doc.categories.filter((c) => c.id !== id));

  const visibleItems = doc.items.filter(inScope);
  const itemsOf = (categoryId: string | null) =>
    doc.items.filter((it) => (it.category_id ?? null) === categoryId && inScope(it));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  // Stable, hydration-safe id so dnd-kit's a11y `aria-describedby` matches server↔client
  // (the builder mounts on both /dashboard/services and /products → counter drift otherwise).
  const dndId = useId();
  /** Cross-container drag: move an item into a category section and reorder. */
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const activeItem = doc.items.find((it) => it.id === activeId);
    if (!activeItem) return;

    let targetCat: string | null;
    let overItemId: string | null;
    if (overId.startsWith("cat:")) {
      const raw = overId.slice(4);
      targetCat = raw === "none" ? null : raw;
      overItemId = null;
    } else {
      const overItem = doc.items.find((it) => it.id === overId);
      if (!overItem) return;
      targetCat = overItem.category_id ?? null;
      overItemId = overId;
    }

    const rest = doc.items.filter((it) => it.id !== activeId);
    const moved: Item = { ...activeItem, category_id: targetCat };
    if (overItemId) {
      const idx = rest.findIndex((it) => it.id === overItemId);
      rest.splice(idx < 0 ? rest.length : idx, 0, moved);
    } else {
      const sameCat = rest
        .map((it, k) => ((it.category_id ?? null) === targetCat ? k : -1))
        .filter((k) => k >= 0);
      const insertAt = sameCat.length
        ? sameCat[sameCat.length - 1] + 1
        : rest.length;
      rest.splice(insertAt, 0, moved);
    }
    updateDoc(rest);
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Normalize sort_order + validate. Returns the clean doc, or null (toasts why). */
  function buildValidDoc(): CatalogDocument | null {
    const normalized: CatalogDocument = {
      ...doc,
      items: doc.items.map((it, idx) => ({ ...it, sort_order: idx })),
    };
    const dupErr = findDuplicateKeys(normalized);
    if (dupErr) {
      toast.error(dupErr);
      return null;
    }
    const parsed = catalogDocumentSchema.safeParse(normalized);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(`Document invalid: ${first.path.join(".")} — ${first.message}`);
      return null;
    }
    return parsed.data;
  }

  /**
   * Upload any locally-previewed images (blob: URLs held since the user picked them)
   * and swap them for their stored paths. Runs at save/publish time only — so picking
   * images never touches storage. Throws (→ caller toasts) if storage isn't ready.
   */
  async function persistImages(d: CatalogDocument): Promise<CatalogDocument> {
    const items = await Promise.all(
      d.items.map(async (it) => {
        if (!it.images.some(isLocalImage)) return it;
        const images = await Promise.all(
          it.images.map((img) =>
            isLocalImage(img) ? persistLocalImage(img, shopId) : Promise.resolve(img)
          )
        );
        it.images.forEach((img) => {
          if (img.startsWith("blob:")) URL.revokeObjectURL(img);
        });
        return { ...it, images };
      })
    );
    return { ...d, items };
  }

  async function save() {
    if (!draftId) return;
    const valid = buildValidDoc();
    if (!valid) return;

    if (localMode) {
      setDoc(valid);
      setDirty(false);
      console.log("[catalog local mode] document:", valid);
      toast.success("Document valid (mod local — nu a fost trimis la backend)");
      return;
    }

    setBusy(true);
    try {
      const persisted = await persistImages(valid);
      await saveDraftDocument(draftId, persisted);
      setDoc(persisted);
      setDirty(false);
      toast.success("Catalog salvat în schiță");
    } catch (e) {
      toast.error(`Salvarea a eșuat: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  /** Save the current draft, then make it the live version (publish). */
  async function publishDraft() {
    if (!draftId) return;
    const valid = buildValidDoc();
    if (!valid) return;

    if (localMode) {
      toast.success("Mod local — publicarea nu trimite la backend");
      return;
    }

    setBusy(true);
    try {
      const persisted = await persistImages(valid);
      await saveDraftDocument(draftId, persisted);
      await publishVersion(draftId);
      // The draft is now the live version → drop back to read-only view of it.
      setLiveId(draftId);
      setDoc(persisted);
      setDraftId(null);
      setVersion(null);
      setDirty(false);
      toast.success("Catalog publicat — acum este versiunea live");
      router.refresh();
    } catch (e) {
      toast.error(`Publicarea a eșuat: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  /** A version was made live from the history drawer — show it read-only. */
  function onActivate(versionId: string, activated: CatalogDocument) {
    setLiveId(versionId);
    setDoc(activated);
    setDraftId(null);
    setVersion(null);
    setDirty(false);
    router.refresh();
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>{copy.heading}</Title>
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
            {roCount(visibleItems.length, copy.one, copy.many)}
          </Text>
        </Group>
      </div>

      {/* Actions on their own row, spread to opposite ends:
          history / discard on the LEFT, save / publish (or edit) on the RIGHT. */}
      <Group justify="space-between" gap="sm" wrap="wrap">
        <Group gap="xs">
          {!localMode && (
            <CatalogVersions
              shopId={shopId}
              activeVersionId={liveId}
              onActivate={onActivate}
              canManage={canEdit}
            />
          )}
          {canEdit && editing && (
            <Button
              variant="subtle"
              color="gray"
              leftSection={<X size={16} />}
              onClick={requestCancelEditing}
              disabled={busy}
            >
              Renunță
            </Button>
          )}
        </Group>

        {canEdit && (
          <Group gap="xs">
            {editing ? (
              <>
                <Button
                  variant="default"
                  leftSection={<Save size={16} />}
                  onClick={save}
                  loading={busy}
                  disabled={!dirty}
                >
                  Salvează
                </Button>
                <Button
                  leftSection={<Rocket size={16} />}
                  onClick={publishDraft}
                  loading={busy}
                  disabled={!hasUnpublishedChanges}
                >
                  Publică
                </Button>
              </>
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
        )}
      </Group>

      {!editing && (
        <Alert color="brand" variant="light">
          {canEdit
            ? `Vezi catalogul live. Apasă „Editează catalogul" pentru a crea o schiță pe care o modifici, o salvezi și apoi o publici. Din „Versiuni" poți comuta între versiuni sau reveni la una anterioară.`
            : `Ai acces doar de vizualizare. Doar membrii cu rol „catalog" sau „owner" pot edita și publica catalogul.`}
        </Alert>
      )}

      {editing ? (
        <>
          <Group>
            {kind ? (
              <Button leftSection={<Plus size={16} />} onClick={() => addItem(kind)}>
                {copy.add}
              </Button>
            ) : (
              <Menu shadow="md" position="bottom-start">
                <Menu.Target>
                  <Button leftSection={<Plus size={16} />}>Adaugă item</Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item onClick={() => addItem("service")}>Serviciu</Menu.Item>
                  <Menu.Item onClick={() => addItem("product")}>Produs</Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
            <Button
              variant="default"
              leftSection={<Plus size={16} />}
              onClick={addCategory}
            >
              Adaugă categorie
            </Button>
          </Group>

          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragEnd={onDragEnd}
          >
            <Stack gap="md">
              {doc.categories.map((cat) => (
                <CategorySection
                  key={cat.id}
                  categoryId={cat.id}
                  name={cat.name}
                  items={itemsOf(cat.id)}
                  categories={doc.categories}
                  kind={kind}
                  onRename={(name) => renameCategory(cat.id, name)}
                  onDelete={() => deleteCategory(cat.id)}
                  onAddItem={(k) => addItem(k, cat.id)}
                  onItemChange={updateItemById}
                  onItemRemove={removeItemById}
                />
              ))}
              <CategorySection
                categoryId={null}
                name=""
                items={itemsOf(null)}
                categories={doc.categories}
                kind={kind}
                onItemChange={updateItemById}
                onItemRemove={removeItemById}
              />
            </Stack>
          </DndContext>
        </>
      ) : visibleItems.length === 0 ? (
        <Paper withBorder radius="lg" p={48} ta="center" c="dimmed">
          {copy.empty}
        </Paper>
      ) : (
        <Stack gap="lg">
          {/* Grouped by category (mirrors the edit view); empty categories are hidden. */}
          {doc.categories.map((cat) => {
            const items = itemsOf(cat.id);
            if (items.length === 0) return null;
            return (
              <Stack key={cat.id} gap="sm">
                <Group gap="xs" align="baseline">
                  <Text fw={700}>{cat.name || "Categorie"}</Text>
                  <Text fz="xs" c="dimmed">
                    {roCount(items.length, copy.one, copy.many)}
                  </Text>
                </Group>
                <Stack gap="md">
                  {items.map((item) => (
                    <ItemReadOnlyCard key={item.id} item={item} categories={doc.categories} />
                  ))}
                </Stack>
              </Stack>
            );
          })}
          {/* Uncategorized */}
          {itemsOf(null).length > 0 && (
            <Stack gap="sm">
              <Group gap="xs" align="baseline">
                <Text fw={700} c="dimmed">
                  Fără categorie
                </Text>
                <Text fz="xs" c="dimmed">
                  {roCount(itemsOf(null).length, copy.one, copy.many)}
                </Text>
              </Group>
              <Stack gap="md">
                {itemsOf(null).map((item) => (
                  <ItemReadOnlyCard key={item.id} item={item} categories={doc.categories} />
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
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

      <ActionIcon
        onClick={scrollToTop}
        variant="filled"
        size="xl"
        radius="xl"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1000,
          boxShadow: "var(--mantine-shadow-md)",
        }}
        aria-label="Scroll to top"
      >
        <ArrowUp size={18} />
      </ActionIcon>

      {/* "Ești sigur?" — guards against losing unsaved edits when leaving edit mode. */}
      <Modal
        opened={confirmOpen}
        onClose={closeConfirm}
        withCloseButton={false}
        centered
        size="sm"
        padding="xl"
      >
        <Stack align="center" gap="sm">
          <ThemeIcon variant="light" color="yellow" size={56} radius="xl">
            <AlertCircle size={26} />
          </ThemeIcon>
          <Text fw={800} fz="lg" ta="center" c="var(--mantine-color-text)">
            Ești sigur?
          </Text>
          <Text c="dimmed" ta="center" fz="sm">
            Ai modificări nesalvate care se vor pierde dacă ieși din editare.
          </Text>
          <Group grow w="100%" mt="md" gap="sm">
            <Button variant="default" onClick={closeConfirm}>
              Nu
            </Button>
            <Button color="red" leftSection={<X size={16} />} onClick={doCancelEditing}>
              Da, renunță
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
