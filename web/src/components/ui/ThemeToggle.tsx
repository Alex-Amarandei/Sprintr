"use client";

import {
  ActionIcon,
  Menu,
  useMantineColorScheme,
  useComputedColorScheme,
} from "@mantine/core";
import { Monitor, Moon, Sun } from "lucide-react";

/** Light / Dark / System theme switcher. "auto" follows the OS preference. */
export function ThemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light");
  const Icon = colorScheme === "auto" ? Monitor : computed === "dark" ? Moon : Sun;

  return (
    <Menu shadow="md" width={170} position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Schimbă tema">
          <Icon size={20} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<Sun size={16} />}
          onClick={() => setColorScheme("light")}
          c={colorScheme === "light" ? "brand.6" : undefined}
        >
          Luminos
        </Menu.Item>
        <Menu.Item
          leftSection={<Moon size={16} />}
          onClick={() => setColorScheme("dark")}
          c={colorScheme === "dark" ? "brand.6" : undefined}
        >
          Întunecat
        </Menu.Item>
        <Menu.Item
          leftSection={<Monitor size={16} />}
          onClick={() => setColorScheme("auto")}
          c={colorScheme === "auto" ? "brand.6" : undefined}
        >
          Sistem
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
