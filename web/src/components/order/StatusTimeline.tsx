import { Box, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { Check, X } from "lucide-react";
import { isCompletedStatus, isEtaActive, type OrderStatus } from "@/lib/design/status";
import { TintIcon } from "@/components/ui/TintIcon";
import { EtaCountdown } from "./EtaCountdown";

const LABELS: Partial<Record<OrderStatus, string>> = {
  pending: "Plasată",
  accepted: "Acceptată",
  in_progress: "În pregătire",
  ready_for_pickup: "Gata de ridicare",
  picked_up: "Ridicată",
  in_delivery: "În livrare",
  delivered: "Livrată",
};

const PICKUP_FLOW: OrderStatus[] = [
  "pending",
  "accepted",
  "in_progress",
  "ready_for_pickup",
  "picked_up",
];
const DELIVERY_FLOW: OrderStatus[] = [
  "pending",
  "accepted",
  "in_progress",
  "in_delivery",
  "delivered",
];

/** Vertical order-status timeline, fulfilment-aware (pickup vs delivery paths). */
export function StatusTimeline({
  status,
  fulfilment,
  times = {},
  eta,
  etaAt,
}: {
  status: OrderStatus;
  fulfilment?: "pickup" | "delivery";
  times?: Partial<Record<OrderStatus, string>>;
  eta?: string;
  etaAt?: string | null;
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

  const flow = fulfilment === "pickup" ? PICKUP_FLOW : DELIVERY_FLOW;
  // Legacy "done" (older orders) maps to the final step; an unknown status that's completed also does.
  const effective = status === "done" ? flow[flow.length - 1] : status;
  let current = flow.indexOf(effective);
  if (current === -1) current = isCompletedStatus(status) ? flow.length - 1 : 0;

  return (
    <Stack gap={0}>
      {flow.map((step, i) => {
        const done = i < current;
        const isCurrent = i === current;
        const future = i > current;
        const last = i === flow.length - 1;
        // ETA is only shown while the order is still being prepared (hidden once in delivery/terminal).
        const etaActive = isEtaActive(status);
        const timeStr = times[step] ?? (future && last && !etaAt && etaActive ? (eta ? `Estimat ${eta}` : undefined) : undefined);
        const showCountdown = future && last && !!etaAt && etaActive;
        return (
          <Group key={step} align="flex-start" gap="sm" wrap="nowrap">
            <Stack gap={0} align="center">
              {future ? (
                <TintIcon size={26} radius="xl" color="mist">
                  <span />
                </TintIcon>
              ) : (
                <ThemeIcon size={26} radius="xl" variant="filled" color={done ? "teal" : "brand"}>
                  {done ? <Check size={14} /> : <span />}
                </ThemeIcon>
              )}
              {!last && (
                <Box w={2} h={30} bg={done ? "teal.6" : "var(--mantine-color-default-border)"} />
              )}
            </Stack>
            <Box pb={last ? 0 : "md"}>
              <Text fw={isCurrent ? 700 : 500} c={future ? "dimmed" : "var(--mantine-color-text)"}>
                {LABELS[step] ?? step}
              </Text>
              {(timeStr || showCountdown) && (
                <Text fz="xs" c="dimmed">
                  {showCountdown ? <>Estimat <EtaCountdown at={etaAt!} inherit /></> : timeStr}
                </Text>
              )}
            </Box>
          </Group>
        );
      })}
    </Stack>
  );
}
