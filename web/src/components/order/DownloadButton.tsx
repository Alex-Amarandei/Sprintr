"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "@mantine/core";
import { Download } from "lucide-react";
import { toast } from "sonner";

/**
 * Downloads order files via the signed-URL endpoint (`/api/orders/[id]/files`). With a
 * `fileName`, downloads just that file; otherwise all attached files. The bucket is private,
 * so the server mints short-lived signed URLs (auth-gated to the order's participants).
 */
export function DownloadButton({
  orderId,
  label = "Descarcă",
  fileName,
  ...props
}: { orderId: string; label?: string; fileName?: string } & ButtonProps) {
  const [loading, setLoading] = useState(false);

  function triggerDownload(href: string, name?: string) {
    const a = document.createElement("a");
    a.href = href;
    if (name) a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function download() {
    setLoading(true);
    try {
      // "All" → one server-zipped archive (browsers throttle many simultaneous downloads).
      if (!fileName) {
        triggerDownload(`/api/orders/${orderId}/files?zip=1`);
        return;
      }
      // Single file → its signed URL.
      const res = await fetch(`/api/orders/${orderId}/files`);
      if (!res.ok) throw new Error("fetch failed");
      const { files } = (await res.json()) as { files: { name: string; url: string }[] };
      const target = files.find((f) => f.name === fileName);
      if (!target) {
        toast.error("Fișierul nu este disponibil.");
        return;
      }
      triggerDownload(target.url, target.name);
    } catch {
      toast.error("Descărcarea a eșuat.");
    } finally {
      setLoading(false);
    }
  }

  // Empty label → icon-only button (no leftSection margin around an absent label).
  if (!label) {
    return (
      <Button
        variant="default"
        size="xs"
        px="xs"
        loading={loading}
        onClick={download}
        aria-label="Descarcă"
        {...props}
      >
        <Download size={14} />
      </Button>
    );
  }

  return (
    <Button
      variant="default"
      size="xs"
      leftSection={<Download size={14} />}
      loading={loading}
      onClick={download}
      {...props}
    >
      {label}
    </Button>
  );
}
