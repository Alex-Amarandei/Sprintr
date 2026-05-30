import { Badge, type BadgeProps } from "@mantine/core";
import { ORDER_STATUS, type OrderStatus } from "@/lib/design/status";
import { Dot } from "./Dot";

/** Order-status pill — colour + Romanian label resolved from the status token. */
export function StatusBadge({
  status,
  ...props
}: { status: OrderStatus } & Omit<BadgeProps, "color" | "children">) {
  const { label, color, badgeColor, badgeVariant = "light" } =
    ORDER_STATUS[status];
  const filled = badgeVariant === "filled";
  return (
    <Badge
      color={badgeColor ?? color}
      variant={badgeVariant}
      leftSection={<Dot color={color} solid={filled} />}
      {...props}
    >
      {label}
    </Badge>
  );
}
