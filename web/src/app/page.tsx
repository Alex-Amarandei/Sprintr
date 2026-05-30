import { redirect } from "next/navigation";
import {
  Badge,
  Box,
  Card,
  Container,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  ArrowRight,
  FileText,
  Sliders,
  Store,
  Truck,
} from "lucide-react";
import { LinkAnchor, LinkButton } from "@/components/ui/links";
import { createClient } from "@/lib/supabase/server";

const STEPS = [
  { n: "01", icon: Store, title: "Alegi un magazin", text: "Vezi magazinele deschise lângă tine, cu rating și timp estimat." },
  { n: "02", icon: Sliders, title: "Configurezi exact ce vrei", text: "Atașezi PDF-ul, alegi pagini, culoare, legare. Prețul se calculează live." },
  { n: "03", icon: Truck, title: "Primești comanda", text: "Magazinul confirmă, pregătește și ți-o livrează. Chat în timp real." },
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
    <Box bg="white">
      {/* Marketing nav */}
      <Box
        component="header"
        style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
      >
        <Container size="lg" h={64}>
          <Group h="100%" justify="space-between">
            <Text fw={800} fz="xl" c="brand.6">
              sprintR
            </Text>
            <Group gap="md">
              <LinkAnchor href="/login" c="ink.8" fw={500} underline="never">
                Conectează-te
              </LinkAnchor>
              <LinkButton href="/browse" rightSection={<ArrowRight size={16} />}>
                Comandă acum
              </LinkButton>
            </Group>
          </Group>
        </Container>
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
            <Title fz={{ base: 40, sm: 56 }} lh={1.05} c="ink.9">
              Papetărie & printare,{" "}
              <Text span inherit c="brand.6">
                livrate ca mâncarea.
              </Text>
            </Title>
            <Text fz="lg" c="dimmed" maw={460}>
              Comandă lucrări de licență, copii, caiete sau orice produs de birou
              de la magazinele din oraș. Livrare sub 60 de minute.
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
            <Group gap={40} mt="md">
              <div>
                <Text fz={28} fw={800} c="ink.9">12+</Text>
                <Text fz="sm" c="dimmed">magazine</Text>
              </div>
              <div>
                <Text fz={28} fw={800} c="ink.9">&lt; 60 min</Text>
                <Text fz="sm" c="dimmed">livrare</Text>
              </div>
              <div>
                <Text fz={28} fw={800} c="ink.9">4.9 ★</Text>
                <Text fz="sm" c="dimmed">rating mediu</Text>
              </div>
            </Group>
          </Stack>

          {/* Floating order-preview card */}
          <Box style={{ display: "flex", alignItems: "center" }}>
            <Card w="100%" shadow="md">
              <Group justify="space-between" mb="md">
                <Text fw={700}>Configurare comandă</Text>
                <Badge variant="light" color="brand">
                  În configurare
                </Badge>
              </Group>
              <Paper
                radius="md"
                h={150}
                mb="md"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "linear-gradient(135deg, var(--mantine-color-slate-8), var(--mantine-color-ink-8))",
                }}
              >
                <ThemeIcon variant="transparent" c="white" size={48}>
                  <FileText size={44} strokeWidth={1.5} />
                </ThemeIcon>
              </Paper>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text c="dimmed" fz="sm">Pagini</Text>
                  <Text fw={500} fz="sm">100 pag</Text>
                </Group>
                <Group justify="space-between">
                  <Text c="dimmed" fz="sm">Printare</Text>
                  <Text fw={500} fz="sm">Color · +0,60 lei/pag</Text>
                </Group>
                <Group justify="space-between">
                  <Text c="dimmed" fz="sm">Legare</Text>
                  <Text fw={500} fz="sm">Spirală · +10 lei</Text>
                </Group>
              </Stack>
              <Divider my="md" />
              <Group justify="space-between" align="center">
                <div>
                  <Text tt="uppercase" fz={10} fw={700} c="dimmed">Total</Text>
                  <Text fz={28} fw={800} c="ink.9" lh={1}>
                    75,00 <Text span fz="sm" c="dimmed">lei</Text>
                  </Text>
                </div>
                <LinkButton href="/browse">Adaugă</LinkButton>
              </Group>
            </Card>
          </Box>
        </SimpleGrid>
      </Container>

      {/* How it works */}
      <Box bg="gray.0" py={64}>
        <Container size="lg">
          <Stack align="center" gap={4} mb="xl">
            <Badge variant="light" color="mist" radius="xl">
              Cum funcționează
            </Badge>
            <Title order={2} ta="center">
              Trei pași până în mâna ta
            </Title>
            <Text c="dimmed" ta="center">
              Fără apeluri, fără emailuri, fără drumuri. De pe telefon, în câteva minute.
            </Text>
          </Stack>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
            {STEPS.map(({ n, icon: Icon, title, text }, i) => (
              <Card key={n}>
                <Group justify="space-between" mb="md">
                  <ThemeIcon
                    variant={i === 1 ? "filled" : "light"}
                    color={i === 1 ? "brand" : "mist"}
                    size={48}
                    radius="md"
                  >
                    <Icon size={24} />
                  </ThemeIcon>
                  <Text fz="sm" fw={700} c="mist.5">
                    {n}
                  </Text>
                </Group>
                <Text fw={700} fz="lg">{title}</Text>
                <Text c="dimmed" fz="sm" mt={4}>{text}</Text>
              </Card>
            ))}
          </SimpleGrid>
        </Container>
      </Box>
    </Box>
  );
}
