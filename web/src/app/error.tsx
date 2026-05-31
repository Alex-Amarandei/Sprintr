"use client";

import { Button, Container, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * App-level error boundary. Renders inside the root layout (MantineProvider available) when a
 * route segment throws on the client, instead of the raw browser error screen.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container size="sm" py={96}>
      <Stack align="center" gap="md" ta="center">
        <ThemeIcon size={64} radius="xl" variant="light" color="red">
          <AlertTriangle size={32} />
        </ThemeIcon>
        <Title order={2}>Ceva n-a mers bine</Title>
        <Text c="dimmed">
          A apărut o eroare neașteptată. Încearcă din nou — dacă problema persistă, revino în câteva
          minute.
        </Text>
        <Button mt="sm" leftSection={<RotateCcw size={16} />} onClick={reset}>
          Reîncearcă
        </Button>
      </Stack>
    </Container>
  );
}
