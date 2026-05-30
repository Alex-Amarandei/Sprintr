"use client";

import { useEffect, useState } from "react";
import { ActionIcon, Box, Stack, Text, Tooltip } from "@mantine/core";
import { Check, Copy } from "lucide-react";

/**
 * A palette swatch that reveals a copy icon on hover; clicking copies the
 * resolved hex (read from the Mantine CSS var, so it always matches what's shown).
 */
export function ColorSwatch({ token, index }: { token: string; index: number }) {
  const [hex, setHex] = useState("");
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(`--mantine-color-${token}-${index}`)
      .trim();
    setHex(value);
  }, [token, index]);

  async function copy() {
    if (!hex) return;
    try {
      await navigator.clipboard.writeText(hex);
    } catch {
      // clipboard may be blocked (insecure context) — still show feedback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <Stack gap={4} align="center">
      <Box
        w={52}
        h={44}
        bg={`${token}.${index}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "relative",
          borderRadius: 8,
          border: "1px solid var(--mantine-color-default-border)",
        }}
      >
        <Tooltip label={copied ? "Copiat!" : hex || "…"} withArrow position="top">
          <ActionIcon
            aria-label={`Copiază ${hex}`}
            variant="white"
            color="dark"
            size="sm"
            radius="xl"
            onClick={copy}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              opacity: hovered || copied ? 1 : 0,
              pointerEvents: hovered ? "auto" : "none",
              transition: "opacity 120ms ease",
              boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </ActionIcon>
        </Tooltip>
      </Box>
      <Text fz={10} c="dimmed">
        {index}
      </Text>
    </Stack>
  );
}
