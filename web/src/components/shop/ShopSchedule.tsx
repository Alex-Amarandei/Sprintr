import { Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { Clock } from "lucide-react";
import { Dot } from "@/components/ui/Dot";
import {
  getScheduleStatus,
  groupSchedule,
  type WeeklySchedule,
} from "@/lib/shop/schedule";

/**
 * Compact weekly opening-hours panel for the shop page.
 * Header shows the live open/closed status; consecutive days with identical
 * hours are collapsed into ranges (e.g. "Luni – Vineri · 08:00 – 20:00").
 */
export function ShopSchedule({ schedule }: { schedule: WeeklySchedule }) {
  const status = getScheduleStatus(schedule);
  const groups = groupSchedule(schedule);

  return (
    <Paper withBorder radius="lg" p="md">
      {/* Header: title + live status */}
      <Group justify="space-between" align="center" mb="xs">
        <Group gap="xs">
          <ThemeIcon variant="light" color="slate" radius="md" size="sm">
            <Clock size={14} />
          </ThemeIcon>
          <Text fw={700}>Program</Text>
        </Group>
        <Group gap={6} align="center">
          <Dot color={status.open ? "teal" : "red"} />
          <Text fz="sm" fw={600} c={status.open ? "teal.7" : "red.7"}>
            {status.label}
          </Text>
        </Group>
      </Group>

      {/* Grouped day ranges */}
      <Stack gap={4}>
        {groups.map((g) => (
          <Group key={g.label} justify="space-between" gap="sm">
            <Text fz="sm" fw={g.containsToday ? 700 : 500} c={g.containsToday ? "var(--mantine-color-text)" : "dimmed"}>
              {g.label}
              {g.containsToday && (
                <Text span fz="xs" fw={700} c="brand.7" ml={6}>
                  azi
                </Text>
              )}
            </Text>
            {g.hours ? (
              <Text fz="sm" fw={g.containsToday ? 700 : 500} c="var(--mantine-color-text)">
                {g.hours.open} – {g.hours.close}
              </Text>
            ) : (
              <Text fz="sm" c="stone.5">
                Închis
              </Text>
            )}
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}
