"use client";

import { useEffect, useState } from "react";
import { Title } from "@mantine/core";

/** Romanian greeting by the user's local hour. */
function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return "Bună dimineața";
  if (hour >= 12 && hour < 18) return "Bună ziua";
  return "Bună seara";
}

/**
 * Time-aware greeting. Computed client-side (the user's local clock) — starts at a
 * neutral default on the server to avoid a hydration mismatch, then resolves on mount.
 */
export function DashboardGreeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState("Bună ziua");

  useEffect(() => {
    setGreeting(greetingFor(new Date().getHours()));
  }, []);

  return (
    <Title order={2}>
      {greeting}, {name} 👋
    </Title>
  );
}
