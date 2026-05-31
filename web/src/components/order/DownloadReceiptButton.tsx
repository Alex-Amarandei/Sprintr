"use client";

import { Button, Tooltip } from "@mantine/core";
import { Download } from "lucide-react";

/**
 * "Descarcă chitanța" — links to the invoice PDF endpoint. Only enabled once the order is
 * terminal (done/rejected); otherwise it's shown disabled with a tooltip explaining why
 * (uses Mantine's `data-disabled` so the tooltip still appears on hover).
 */
export function DownloadReceiptButton({
  orderId,
  enabled,
}: {
  orderId: string;
  enabled: boolean;
}) {
  if (enabled) {
    return (
      <Button
        component="a"
        href={`/api/orders/${orderId}/invoice`}
        target="_blank"
        rel="noopener"
        variant="default"
        leftSection={<Download size={16} />}
      >
        Descarcă chitanța
      </Button>
    );
  }

  return (
    <Tooltip
      label="Chitanța va fi disponibilă după finalizarea comenzii"
      withArrow
      multiline
      w={220}
    >
      <Button
        variant="default"
        leftSection={<Download size={16} />}
        data-disabled
        onClick={(e) => e.preventDefault()}
      >
        Descarcă chitanța
      </Button>
    </Tooltip>
  );
}
