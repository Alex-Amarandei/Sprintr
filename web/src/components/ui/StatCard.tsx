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
        {/* Pin to the light-mode tinted look in both schemes (vivid, not dulled in dark). */}
        <ThemeIcon
          color={color}
          size={42}
          radius="md"
          style={{
            backgroundColor: `var(--mantine-color-${color}-1)`,
            color: `var(--mantine-color-${color}-7)`,
          }}
        >
          {icon}
        </ThemeIcon>
        {delta && (
          <Text
            fz="xs"
            fw={600}
            style={{
              color:
                "light-dark(var(--mantine-color-teal-7), var(--mantine-color-teal-4))",
            }}
          >
            {delta}
          </Text>
        )}
      </Group>
      <Text fz={24} fw={700} mt="sm" lh={1.1}>
        {value}
      </Text>
      <Text c="dimmed" fz="sm" mt={2}>
        {label}
      </Text>
    </Card>
  );
}
