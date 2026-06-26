import { Metadata } from "next";
import { Box, Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { ArrowLeft, Mail } from "lucide-react";
import { LinkAnchor } from "@/components/ui/links";
import { Logo } from "@/components/ui/Logo";
import { PageBackground } from "@/components/ui/PageBackground";
import { SiteFooter } from "@/components/ui/SiteFooter";

export const metadata: Metadata = {
  title: "Suport",
  description: "Ai nevoie de ajutor? Echipa Sprintr îți răspunde.",
};

const SUPPORT_EMAIL = "alex.m.amarandei@gmail.com";

export default function SupportPage() {
  return (
    <Box
      mih="100vh"
      bg="var(--mantine-color-body)"
      style={{ display: "flex", flexDirection: "column", isolation: "isolate" }}
    >
      <PageBackground />

      <Box
        component="header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        <Container size="lg" h={64}>
          <Group h="100%" justify="space-between" wrap="nowrap">
            <LinkAnchor href="/" underline="never" display="inline-flex">
              <Logo />
            </LinkAnchor>
            <LinkAnchor href="/browse" c="dimmed" fz="sm" underline="never">
              <Group gap={4} component="span">
                <ArrowLeft size={15} /> Înapoi la magazine
              </Group>
            </LinkAnchor>
          </Group>
        </Container>
      </Box>

      <Box style={{ flex: 1 }}>
        <Container size="sm" py="xl">
          <Stack gap="lg">
            <div>
              <Title order={1}>Ai nevoie de ajutor?</Title>
              <Text c="dimmed" mt={4}>
                Suntem aici pentru clienți și pentru magazinele partenere deopotrivă.
              </Text>
            </div>

            <Text>
              Pentru orice întrebare, problemă cu o comandă, sau ajutor cu contul de magazin,
              scrie-ne pe email și îți răspundem cât putem de repede. Te rugăm să incluzi, dacă e
              cazul, numărul comenzii ca să putem ajuta mai rapid.
            </Text>

            <Group>
              <Button
                component="a"
                href={`mailto:${SUPPORT_EMAIL}`}
                leftSection={<Mail size={18} />}
                size="md"
              >
                Scrie-ne pe email
              </Button>
            </Group>

            <Text c="dimmed" fz="sm">
              Sau direct la adresa:{" "}
              <LinkAnchor href={`mailto:${SUPPORT_EMAIL}`} c="brand.6" fw={600}>
                {SUPPORT_EMAIL}
              </LinkAnchor>
            </Text>
          </Stack>
        </Container>
      </Box>

      <SiteFooter />
    </Box>
  );
}
