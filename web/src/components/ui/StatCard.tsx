import { Card, Group, Text, ThemeIcon } from "@mantine/core";
import type { MantineColor } from "@mantine/core";
import type { ReactNode } from "react";

/** KPI tile — tinted icon, optional delta chip, big value, label. */
export function StatCard({
  icon,
  value,
  label,
  delta,
  color = "brand",
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  delta?: string;
  color?: MantineColor;
}) {
  return (
    <Card>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <ThemeIcon variant="light" color={color} size={42} radius="md">
          {icon}
        </ThemeIcon>
        {delta && (
          <Text fz="xs" fw={600} c="teal.7">
            {delta}
          </Text>
        )}
      </Group>
      <Text fz={28} fw={700} mt="sm" lh={1.1}>
        {value}
      </Text>
      <Text c="dimmed" fz="sm" mt={2}>
        {label}
      </Text>
    </Card>
  );
}
