"use client";

import { Button, type ButtonProps } from "@mantine/core";
import { Download } from "lucide-react";
import { toast } from "sonner";

/**
 * Download affordance for order files. TODO(BE): swap toast for a server-generated
 * signed URL to the private `order-files` bucket.
 */
export function DownloadButton({
  label = "Descarcă",
  fileName,
  ...props
}: { label?: string; fileName?: string } & ButtonProps) {
  return (
    <Button
      variant="default"
      size="xs"
      leftSection={<Download size={14} />}
      onClick={() => toast.success(`Se descarcă ${fileName ?? "fișierele"}…`)}
      {...props}
    >
      {label}
    </Button>
  );
}
