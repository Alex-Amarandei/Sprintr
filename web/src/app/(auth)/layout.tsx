import {
  Box,
  Container,
  Flex,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { MessagesSquare, Sliders, Truck } from "lucide-react";
import { LinkAnchor } from "@/components/ui/links";
import { Logo } from "@/components/ui/Logo";
import { PageBackground } from "@/components/ui/PageBackground";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const PERKS = [
  {
    icon: Sliders,
    title: "Configurezi online",
    text: "Atașezi PDF-ul, alegi finisajele și vezi prețul pe loc.",
  },
  {
    icon: MessagesSquare,
    title: "Chat în timp real",
    text: "Vorbești direct cu magazinul, pe toată durata comenzii.",
  },
  {
    icon: Truck,
    title: "Livrat în Iași",
    text: "Magazinul pregătește totul și ți-l aduce la ușă.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      mih="100vh"
      bg="var(--mantine-color-body)"
      style={{ isolation: "isolate" }}
    >
      {/* Shared full-page aurora background */}
      <PageBackground />

      <Flex direction="column" mih="100vh">
        {/* Top bar */}
        <Group
          justify="space-between"
          align="center"
          wrap="nowrap"
          py="lg"
          px={{ base: "lg", sm: 48 }}
        >
          <LinkAnchor href="/" underline="never" display="inline-flex">
            <Logo height={56} />
          </LinkAnchor>
          <ThemeToggle />
        </Group>

        {/* Centered split: brand panel + auth card */}
        <Container
          size={1040}
          w="100%"
          py={32}
          px="md"
          style={{ flex: 1, display: "flex", alignItems: "center" }}
        >
          <SimpleGrid
            cols={{ base: 1, md: 2 }}
            spacing={56}
            verticalSpacing="xl"
            w="100%"
            style={{ alignItems: "center" }}
          >
            {/* Brand panel — desktop only */}
            <Stack gap="xl" visibleFrom="md">
              <Title fz={40} lh={1.1} c="var(--mantine-color-text)">
                Papetărie & printare,{" "}
                <Text span inherit c="brand.6">
                  livrate ca mâncarea.
                </Text>
              </Title>

              <Stack gap="lg">
                {PERKS.map(({ icon: Icon, title, text }) => (
                  <Group key={title} gap="md" align="flex-start" wrap="nowrap">
                    <ThemeIcon
                      variant="light"
                      color="brand"
                      size={42}
                      radius="md"
                    >
                      <Icon size={20} />
                    </ThemeIcon>
                    <div>
                      <Text fw={700}>{title}</Text>
                      <Text c="dimmed" fz="sm">
                        {text}
                      </Text>
                    </div>
                  </Group>
                ))}
              </Stack>
            </Stack>

            {/* Auth card — centered on mobile, right-aligned on desktop */}
            <Flex justify={{ base: "center", md: "flex-end" }}>
              <Box w="100%" maw={420}>
                {children}
              </Box>
            </Flex>
          </SimpleGrid>
        </Container>
      </Flex>
    </Box>
  );
}
