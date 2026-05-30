"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Box, Burger, Drawer, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { LinkAnchor } from "@/components/ui/links";
import { Wordmark } from "@/components/ui/Wordmark";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

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
      bg="white"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid var(--mantine-color-gray-2)",
      }}
    >
      <Group justify="space-between" align="center" wrap="nowrap" p="md">
        <Group gap="sm" align="center" wrap="nowrap">
          <Burger opened={opened} onClick={open} size="sm" aria-label="Meniu" />
          <LinkAnchor href="/dashboard" fw={700} fz="xl" c="brand.6" underline="never">
            <Wordmark />
          </LinkAnchor>
        </Group>
        <SignOutButton />
      </Group>

      <Drawer
        opened={opened}
        onClose={close}
        size="xs"
        padding="md"
        title={<Wordmark />}
      >
        <DashboardNav onNavigate={close} />
      </Drawer>
    </Box>
  );
}
