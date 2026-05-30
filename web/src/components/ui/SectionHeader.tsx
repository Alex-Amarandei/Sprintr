import { Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

/** Eyebrow + title (+ subtitle) with an optional right-aligned action. */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  order = 2,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  order?: 1 | 2 | 3 | 4;
}) {
  return (
    <Group justify="space-between" align="flex-end" wrap="nowrap" mb="lg">
      <Stack gap={4}>
        {eyebrow && (
          <Text tt="uppercase" fw={700} fz="xs" c="brand.6" style={{ letterSpacing: 0.6 }}>
            {eyebrow}
          </Text>
        )}
        <Title order={order}>{title}</Title>
        {subtitle && (
          <Text c="dimmed" fz="sm">
            {subtitle}
          </Text>
        )}
      </Stack>
      {action}
    </Group>
  );
}
