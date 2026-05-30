import { Box, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { Check, X } from "lucide-react";
import { type OrderStatus, statusStep } from "@/lib/design/status";
import { TintIcon } from "@/components/ui/TintIcon";

const TIMELINE: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Plasată" },
  { status: "accepted", label: "Acceptată" },
  { status: "in_progress", label: "În pregătire" },
  { status: "done", label: "Livrată" },
];

/** Vertical order-status timeline. `times` maps a status → display time (optional). */
export function StatusTimeline({
  status,
  times = {},
  eta,
}: {
  status: OrderStatus;
  times?: Partial<Record<OrderStatus, string>>;
  eta?: string;
}) {
  if (status === "rejected") {
    return (
      <Group gap="sm">
        <ThemeIcon size={28} radius="xl" color="red">
          <X size={16} />
        </ThemeIcon>
        <Text fw={700} c="red.7">
          Comandă respinsă
        </Text>
      </Group>
    );
  }

  const current = statusStep(status);

  return (
    <Stack gap={0}>
      {TIMELINE.map((step, i) => {
        const done = i < current;
        const isCurrent = i === current;
        const future = i > current;
        const last = i === TIMELINE.length - 1;
        const time = times[step.status] ?? (future && last ? eta && `ETA ${eta}` : undefined);
        return (
          <Group key={step.status} align="flex-start" gap="sm" wrap="nowrap">
            <Stack gap={0} align="center">
              {future ? (
                <TintIcon size={26} radius="xl" color="mist">
                  <span />
                </TintIcon>
              ) : (
                <ThemeIcon
                  size={26}
                  radius="xl"
                  variant="filled"
                  color={done ? "teal" : "brand"}
                >
                  {done ? <Check size={14} /> : <span />}
                </ThemeIcon>
              )}
              {!last && (
                <Box
                  w={2}
                  h={30}
                  bg={done ? "teal.6" : "var(--mantine-color-default-border)"}
                />
              )}
            </Stack>
            <Box pb={last ? 0 : "md"}>
              <Text
                fw={isCurrent ? 700 : 500}
                c={future ? "dimmed" : "var(--mantine-color-text)"}
              >
                {step.label}
              </Text>
              {time && (
                <Text fz="xs" c="dimmed">
                  {time}
                </Text>
              )}
            </Box>
          </Group>
        );
      })}
    </Stack>
  );
}
