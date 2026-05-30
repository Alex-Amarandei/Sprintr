import { Box, Group, Stack, Text } from "@mantine/core";

/** Lightweight CSS bar chart (no chart lib). Highlights the last bar. */
export function RevenueBars({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <Group align="flex-end" gap="sm" h={150} mt="md">
      {data.map((d, i) => {
        const h = Math.round((d.value / max) * 120) + 8;
        const last = i === data.length - 1;
        return (
          <Stack key={d.label} gap={6} align="center" style={{ flex: 1 }}>
            <Box
              w="100%"
              h={h}
              bg={last ? "brand.6" : "slate.2"}
              style={{ borderRadius: 6 }}
            />
            <Text fz={11} c="dimmed">
              {d.label}
            </Text>
          </Stack>
        );
      })}
    </Group>
  );
}
