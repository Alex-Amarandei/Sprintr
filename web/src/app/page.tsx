import Image from "next/image";
import { redirect } from "next/navigation";
import {
  Badge,
  Box,
  Card,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { ArrowRight, Sliders, Store, Truck } from "lucide-react";
import { LinkAnchor, LinkButton } from "@/components/ui/links";
import { PageBackground } from "@/components/ui/PageBackground";
import { Reveal } from "@/components/ui/Reveal";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { createClient } from "@/lib/supabase/server";

const STEPS = [
  {
    n: "01",
    icon: Store,
    title: "Alegi un magazin",
    text: "Răsfoiești magazinele din Iași — program, servicii și recenzii reale, toate într-un singur loc.",
  },
  {
    n: "02",
    icon: Sliders,
    title: "Configurezi exact ce vrei",
    text: "Atașezi PDF-ul și alegi paginile, legarea și finisajele. Prețul se actualizează automat, pe loc.",
  },
  {
    n: "03",
    icon: Truck,
    title: "Primești comanda",
    text: "Magazinul confirmă și pregătește totul, iar comanda ajunge direct la tine. Urmărești fiecare pas pe chat, în timp real.",
  },
];

export default async function HomePage() {
  // Logged-in users skip the marketing landing and go straight into the app,
  // routed by their role.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    redirect(profile?.role === "shop" ? "/dashboard" : "/browse");
  }

  return (
    <Box bg="var(--mantine-color-body)" style={{ isolation: "isolate" }}>
      {/* Shared full-page aurora background */}
      <PageBackground />

      <Box>
      {/* Marketing nav */}
      <Box component="header">
        <Group
          justify="flex-end"
          align="center"
          wrap="nowrap"
          gap="md"
          mih={104}
          px={{ base: "lg", sm: 48 }}
        >
          <LinkAnchor
            href="/login"
            fw={600}
            underline="never"
            style={{
              color:
                "light-dark(var(--mantine-color-stone-7), var(--mantine-color-brand-7))",
            }}
          >
            Conectează-te
          </LinkAnchor>
          <ThemeToggle />
        </Group>
      </Box>

      {/* Hero */}
      <Container size="lg" py={64}>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={48} verticalSpacing="xl">
          <Stack gap="lg" justify="center">
            <Badge
              variant="light"
              color="brand"
              size="lg"
              radius="xl"
              w="fit-content"
            >
              ● Acum în Iași
            </Badge>
            <Title
              fz={{ base: 40, sm: 56 }}
              lh={1.05}
              c="var(--mantine-color-text)"
            >
              Papetărie & printare,{" "}
              <Text span inherit c="brand.6">
                livrate ca mâncarea.
              </Text>
            </Title>
            <Text fz="lg" c="dimmed" maw={460}>
              Comandă lucrări de licență, copii, caiete sau orice produs de
              birou de la magazinele din oraș. Livrare sub 60 de minute.
            </Text>
            <Group mt="xs">
              <LinkButton
                href="/browse"
                size="md"
                rightSection={<ArrowRight size={18} />}
              >
                Comandă acum
              </LinkButton>
              <LinkButton
                href="/login"
                size="md"
                variant="default"
                leftSection={<Store size={18} />}
              >
                Sunt magazin
              </LinkButton>
            </Group>
          </Stack>

          {/* Brand logo */}
          <Box
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 460,
            }}
          >
            {/* Soft ember glow behind the mark */}
            <Box
              aria-hidden
              style={{
                position: "absolute",
                width: 460,
                height: 460,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(231,112,35,0.38) 0%, rgba(231,112,35,0.10) 45%, transparent 70%)",
                filter: "blur(10px)",
                pointerEvents: "none",
              }}
            />
            {/* Faint teal counter-glow for depth */}
            <Box
              aria-hidden
              style={{
                position: "absolute",
                width: 320,
                height: 320,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(10,132,151,0.18) 0%, transparent 65%)",
                transform: "translate(90px, 80px)",
                pointerEvents: "none",
              }}
            />
            <Box style={{ position: "relative", zIndex: 1 }}>
              <Image
                src="/logo.svg"
                alt="Sprintr"
                width={420}
                height={420}
                priority
                style={{ width: "min(420px, 82vw)", height: "auto" }}
              />
            </Box>
          </Box>
        </SimpleGrid>
      </Container>

      {/* How it works */}
      <Box py={64}>
        <Container size="lg">
          <Reveal>
            <Stack align="center" gap={4} mb="xl">
              <Badge variant="light" color="mist" radius="xl">
                Cum funcționează
              </Badge>
              <Title order={2} ta="center">
                Trei pași până în mâna ta
              </Title>
              <Text c="dimmed" ta="center">
                Fără apeluri, fără emailuri, fără drumuri. Din aplicație, în
                câteva minute.
              </Text>
            </Stack>
          </Reveal>
          <Stack gap="lg">
            {STEPS.map(({ n, icon: Icon, title, text }, i) => (
              <Reveal key={n} delay={i * 120}>
                <Card className="hero-step-card">
                  <Group justify="space-between" mb="md">
                    <ThemeIcon
                      variant={i === 0 ? "light" : "filled"}
                      color={i === 0 ? "mist" : i === 1 ? "brand" : "cyan.7"}
                      size={48}
                      radius="md"
                    >
                      <Icon size={24} />
                    </ThemeIcon>
                    <Text fz={32} fw={800} c="brand.2" lh={1}>
                      {n}
                    </Text>
                  </Group>
                  <Text fw={700} fz="lg">
                    {title}
                  </Text>
                  <Text c="dimmed" fz="sm" mt={4}>
                    {text}
                  </Text>
                </Card>
              </Reveal>
            ))}
          </Stack>
        </Container>
      </Box>
      </Box>
    </Box>
  );
}
