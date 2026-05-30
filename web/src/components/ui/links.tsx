"use client";

import Link from "next/link";
import {
  ActionIcon,
  Anchor,
  Button,
  NavLink,
  type ActionIconProps,
  type AnchorProps,
  type ButtonProps,
  type NavLinkProps,
} from "@mantine/core";

/**
 * Client wrappers so Server Components can render Mantine components that navigate
 * via Next's <Link> without passing the Link function across the RSC boundary.
 * Server pages pass only serializable props (href is a string).
 */

export function LinkAnchor({
  href,
  children,
  ...props
}: AnchorProps & { href: string; children: React.ReactNode }) {
  return (
    <Anchor component={Link} href={href} {...props}>
      {children}
    </Anchor>
  );
}

export function LinkButton({
  href,
  children,
  ...props
}: ButtonProps & { href: string; children: React.ReactNode }) {
  return (
    <Button component={Link} href={href} {...props}>
      {children}
    </Button>
  );
}

export function LinkActionIcon({
  href,
  children,
  ...props
}: ActionIconProps & {
  href: string;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  return (
    <ActionIcon component={Link} href={href} {...props}>
      {children}
    </ActionIcon>
  );
}

export function LinkNavItem({
  href,
  ...props
}: NavLinkProps & { href: string }) {
  return <NavLink component={Link} href={href} {...props} />;
}
