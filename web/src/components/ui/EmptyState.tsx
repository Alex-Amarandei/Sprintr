import { Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import type { ReactNode } from "react";

/** Centered empty/placeholder block for lists and grids. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Paper withBorder radius="lg" p="xl">
      <Stack align="center" gap="sm" py="lg">
        {icon && (
          <ThemeIcon variant="light" color="mist" size={56} radius="lg">
            {icon}
          </ThemeIcon>
        )}
        <Text fw={600} fz="lg" ta="center">
          {title}
        </Text>
        {description && (
          <Text c="dimmed" fz="sm" ta="center" maw={420}>
            {description}
          </Text>
        )}
        {action}
      </Stack>
    </Paper>
  );
}
