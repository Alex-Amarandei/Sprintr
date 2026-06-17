"use client";

import type { ReactNode } from "react";
import { ActionIcon, Group, Text, Tooltip } from "@mantine/core";
import { Info } from "lucide-react";

/** A small ⓘ icon with an explanatory tooltip — for clarifying non-obvious controls. */
export function InfoHint({ label }: { label: ReactNode }) {
  return (
    <Tooltip
      label={label}
      multiline
      w={240}
      withArrow
      events={{ hover: true, focus: true, touch: true }}
    >
      <ActionIcon
        component="span"
        variant="subtle"
        color="gray"
        size="xs"
        radius="xl"
        tabIndex={-1}
        aria-label="Mai multe informații"
        style={{ cursor: "help" }}
      >
        <Info size={13} />
      </ActionIcon>
    </Tooltip>
  );
}

/** An input label with a trailing info hint, e.g. `label={<HintLabel text="Pas" hint="…" />}`. */
export function HintLabel({ text, hint }: { text: string; hint: ReactNode }) {
  return (
    <Group component="span" gap={4} wrap="nowrap" align="center" display="inline-flex">
      <Text component="span" inherit>
        {text}
      </Text>
      <InfoHint label={hint} />
    </Group>
  );
}
