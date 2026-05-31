"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Box, Burger, Drawer, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { LinkAnchor } from "@/components/ui/links";
import { Logo } from "@/components/ui/Logo";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/** Mobile-only sticky top bar with a hamburger that opens the nav in a Drawer. */
export function MobileNav() {
  const [opened, { open, close }] = useDisclosure(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes.
  useEffect(() => {
    close();
  }, [pathname, close]);

  return (
    <Box
      hiddenFrom="md"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <Group justify="space-between" align="center" wrap="nowrap" p="md">
        <Group gap="sm" align="center" wrap="nowrap">
          <Burger opened={opened} onClick={open} size="sm" aria-label="Meniu" />
          <LinkAnchor href="/dashboard" underline="never" display="inline-flex">
            <Logo />
          </LinkAnchor>
        </Group>
        <Group gap="xs" wrap="nowrap">
          <ThemeToggle />
          <SignOutButton />
        </Group>
      </Group>

      <Drawer
        opened={opened}
        onClose={close}
        size="xs"
        padding="md"
        title={<Logo />}
      >
        <DashboardNav onNavigate={close} />
      </Drawer>
    </Box>
  );
}
