"use client";

import { useMantineColorScheme } from "@mantine/core";
import { Toaster } from "sonner";

/**
 * The global sonner toaster, themed to the app's current Mantine color scheme so toasts match
 * light/dark (was always light). "auto" → "system" so sonner follows the OS preference.
 */
export function ThemedToaster() {
  const { colorScheme } = useMantineColorScheme();
  const theme = colorScheme === "auto" ? "system" : colorScheme;
  return <Toaster position="bottom-right" theme={theme} richColors closeButton />;
}
