"use client";

import { useEffect, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Drawer,
  Group,
  Loader,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { Archive, Check, History, Rocket } from "lucide-react";
import { toast } from "sonner";
import {
  archiveVersion,
  listVersions,
  publishVersion,
  type VersionRow,
} from "@/lib/catalog/api";
import { parseDocument, type CatalogDocument } from "@/lib/catalog/schema";
import { roCount } from "@/lib/utils/format";

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

/**
 * Version history drawer for a shop's catalog. Lets a catalog manager publish a
 * draft, switch/revert to any past version, and archive obsolete ones. The active
 * (live) version is identified by `activeVersionId` (the shop's pointer) — the
 * parent owns that state so the rest of the page stays in sync after a switch.
 */
export function CatalogVersions({
  shopId,
  activeVersionId,
  onActivate,
  canManage = true,
}: {
  shopId: string;
  activeVersionId: string | null;
  /** Called after a version goes live, with its parsed document. */
  onActivate: (versionId: string, doc: CatalogDocument) => void;
  /** Whether the caller may publish/switch/archive (catalog/owner). Else view-only. */
  canManage?: boolean;
}) {
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);

  async function load() {
    setLoading(true);
    try {
      setVersions(await listVersions(shopId));
    } catch (e) {
      toast.error(`Nu am putut încărca versiunile: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (opened) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  async function activate(row: VersionRow) {
    setBusyId(row.id);
    try {
      await publishVersion(row.id);
      onActivate(row.id, parseDocument(row.document));
      toast.success(`v${row.version} este acum versiunea live`);
      await load();
    } catch (e) {
      toast.error(`Publicarea a eșuat: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  async function archive(row: VersionRow) {
    setBusyId(row.id);
    try {
      await archiveVersion(row.id);
      toast.success(`v${row.version} arhivată`);
      await load();
    } catch (e) {
      toast.error(`Arhivarea a eșuat: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Button
        variant="default"
        leftSection={<History size={16} />}
        onClick={() => setOpened(true)}
      >
        Versiuni
      </Button>
      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        position="right"
        title="Versiuni catalog"
        size="md"
      >
        {loading ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : versions.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            Nicio versiune încă. Editează catalogul pentru a crea prima schiță.
          </Text>
        ) : (
          <Stack gap="sm">
            {versions.map((v) => {
              const isLive = v.id === activeVersionId;
              const items = parseDocument(v.document).items.length;
              return (
                <Group
                  key={v.id}
                  justify="space-between"
                  wrap="nowrap"
                  align="flex-start"
                  style={{
                    border: "1px solid var(--mantine-color-default-border)",
                    borderRadius: "var(--mantine-radius-lg)",
                    padding:
                      "var(--mantine-spacing-sm) var(--mantine-spacing-md)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <Group gap="xs" wrap="nowrap">
                      <Text fw={700}>v{v.version}</Text>
                      {isLive ? (
                        <Badge
                          color="teal"
                          variant="light"
                          leftSection={<Check size={12} />}
                        >
                          Live
                        </Badge>
                      ) : v.status === "draft" ? (
                        <Badge color="yellow" variant="light">
                          Schiță
                        </Badge>
                      ) : v.status === "archived" ? (
                        <Badge color="gray" variant="light">
                          Arhivată
                        </Badge>
                      ) : (
                        <Badge color="slate" variant="light">
                          Publicată
                        </Badge>
                      )}
                    </Group>
                    {v.label && (
                      <Text fz="sm" truncate>
                        {v.label}
                      </Text>
                    )}
                    <Text fz="xs" c="dimmed">
                      {roCount(items, "element", "elemente")} ·{" "}
                      {fmtDate(v.created_at)}
                    </Text>
                  </div>
                  {!isLive && canManage && (
                    <Group gap="xs" wrap="nowrap">
                      <Button
                        size="xs"
                        variant={v.status === "draft" ? "filled" : "default"}
                        leftSection={<Rocket size={14} />}
                        loading={busyId === v.id}
                        onClick={() => activate(v)}
                      >
                        {v.status === "draft" ? "Publică" : "Fă activă"}
                      </Button>
                      {v.status !== "archived" && (
                        <Tooltip label="Arhivează">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            loading={busyId === v.id}
                            onClick={() => archive(v)}
                            aria-label="Arhivează versiunea"
                          >
                            <Archive size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  )}
                </Group>
              );
            })}
          </Stack>
        )}
      </Drawer>
    </>
  );
}
