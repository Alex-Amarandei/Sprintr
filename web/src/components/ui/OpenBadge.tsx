import { Badge, type BadgeProps } from "@mantine/core";
import { Dot } from "./Dot";

/** "Deschis" / "Închis" indicator for shops. */
export function OpenBadge({
  open,
  label,
  ...props
}: { open: boolean; label?: string } & Omit<BadgeProps, "color" | "children">) {
  if (open) {
    // Solid teal.4 background per design review.
    return (
      <Badge color="teal.4" variant="filled" leftSection={<Dot solid />} {...props}>
        {label ?? "Deschis"}
      </Badge>
    );
  }
  return (
    <Badge color="red" variant="light" leftSection={<Dot color="red" />} {...props}>
      {label ?? "Închis"}
    </Badge>
  );
}
