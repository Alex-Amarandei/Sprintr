"use client";

import { ActionIcon, CopyButton, Tooltip } from "@mantine/core";
import { Check, Copy } from "lucide-react";

/** Tiny copy-to-clipboard affordance — used next to order numbers so they're easy to paste into
 *  chat or support. Copies the given value (e.g. the short order id). */
export function CopyId({ value, label = "Copiază numărul" }: { value: string; label?: string }) {
  return (
    <CopyButton value={value} timeout={1500}>
      {({ copied, copy }) => (
        <Tooltip label={copied ? "Copiat!" : label} withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={copy}
            aria-label={label}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </ActionIcon>
        </Tooltip>
      )}
    </CopyButton>
  );
}
