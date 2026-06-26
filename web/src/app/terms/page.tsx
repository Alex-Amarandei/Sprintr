import { Metadata } from "next";
import { Anchor, Box, Container, Group, Stack, Text, Title } from "@mantine/core";
import { ArrowLeft } from "lucide-react";
import { LinkAnchor } from "@/components/ui/links";
import { Logo } from "@/components/ui/Logo";
import { PageBackground } from "@/components/ui/PageBackground";
import { SiteFooter } from "@/components/ui/SiteFooter";

export const metadata: Metadata = {
  title: "Termeni și condiții",
  description: "Termenii și condițiile de utilizare a platformei Sprintr.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack gap="xs">
      <Title order={3}>{title}</Title>
      {children}
    </Stack>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <Stack gap="xs">
      {items.map((t, i) => (
        <Group key={i} gap="xs" wrap="nowrap" align="flex-start">
          <Text c="brand.6" fw={700} lh={1.5}>
            •
          </Text>
          <Text>{t}</Text>
        </Group>
      ))}
    </Stack>
  );
}

export default function TermsPage() {
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
        <Container size="md" py="xl">
          <Stack gap="lg">
            <div>
              <Title order={1}>Termeni și condiții</Title>
              <Text c="dimmed" mt={4}>
                Ultima actualizare: 31 mai 2026
              </Text>
            </div>

            <Text>
              Bine ai venit pe Sprintr. Acești Termeni și condiții („Termenii”) reglementează
              utilizarea platformei Sprintr („Platforma”), prin care poți comanda servicii de
              printare, legătorie și produse de papetărie de la magazine partenere din Iași. Prin
              crearea unui cont sau prin plasarea unei comenzi, confirmi că ai citit, ai înțeles și
              ești de acord cu acești Termeni.
            </Text>

            <Section title="1. Despre serviciu">
              <Text>
                Sprintr este o platformă intermediară care conectează clienții cu magazine partenere
                de papetărie și printare. Sprintr facilitează plasarea comenzilor, comunicarea și plata,
                însă serviciile și produsele sunt furnizate și onorate de magazinul ales. Contractul de
                vânzare se încheie direct între tine și magazin.
              </Text>
            </Section>

            <Section title="2. Cont și utilizatori">
              <Bullets
                items={[
                  "Autentificarea se face prin Google. Ești responsabil pentru păstrarea confidențialității contului tău.",
                  "Te obligi să furnizezi informații corecte și actuale (nume, telefon, adresă de livrare).",
                  "Trebuie să ai cel puțin 18 ani sau acordul unui reprezentant legal pentru a plasa comenzi.",
                ]}
              />
            </Section>

            <Section title="3. Comenzi și prețuri">
              <Text>
                Prețurile, descrierile și disponibilitatea produselor sunt stabilite de fiecare magazin
                și pot fi modificate oricând. Totalul comenzii, afișat la finalizare, include prețul
                produselor, eventualele taxe de livrare și un comision de serviciu al Platformei. Toate
                prețurile sunt exprimate în lei (RON) și includ TVA, acolo unde este aplicabil. O comandă
                devine fermă în momentul în care este acceptată de magazin.
              </Text>
            </Section>

            <Section title="4. Plată">
              <Bullets
                items={[
                  "Comenzile cu livrare se plătesc online, cu cardul, prin procesatorul securizat Stripe.",
                  "Comenzile cu ridicare din magazin pot fi plătite online sau în numerar, la ridicare.",
                  "Datele cardului nu sunt stocate pe serverele Sprintr; ele sunt procesate exclusiv de Stripe.",
                ]}
              />
            </Section>

            <Section title="5. Livrare și ridicare">
              <Text>
                Livrarea este disponibilă în Iași, în limitele zonei deservite de magazin. Timpii estimați
                de livrare sau de pregătire sunt orientativi și nu reprezintă o garanție. Pentru comenzile
                cu ridicare, vei fi notificat când comanda este gata.
              </Text>
            </Section>

            <Section title="6. Fișiere și conținut încărcat">
              <Text>
                Pentru anumite servicii încarci fișiere (de ex. documente pentru printare). Ești singurul
                responsabil pentru conținutul încărcat și garantezi că deții drepturile necesare asupra
                acestuia. Este interzisă încărcarea de materiale ilegale, care încalcă drepturi de autor
                ori care au caracter ofensator. Fișierele sunt utilizate exclusiv pentru onorarea comenzii
                și sunt accesibile magazinului care o procesează.
              </Text>
            </Section>

            <Section title="7. Anulări și rambursări">
              <Text>
                Poți anula o comandă înainte de a fi acceptată de magazin. După acceptare, anularea și
                rambursarea se fac conform politicii magazinului. Produsele personalizate (de ex. printuri
                realizate pe baza fișierelor tale) pot fi nerambursabile odată ce producția a început, cu
                excepția cazurilor de neconformitate.
              </Text>
            </Section>

            <Section title="8. Conduita utilizatorului">
              <Text>
                Te obligi să folosești Platforma cu bună-credință și să nu o utilizezi în scopuri frauduloase,
                abuzive sau ilegale. Ne rezervăm dreptul de a suspenda sau închide conturile care încalcă
                acești Termeni.
              </Text>
            </Section>

            <Section title="9. Limitarea răspunderii">
              <Text>
                Sprintr acționează ca intermediar și nu este parte la executarea efectivă a serviciilor de
                printare ori de papetărie. Nu răspundem pentru calitatea lucrărilor, întârzieri sau erori
                care țin de magazin. Platforma este oferită „ca atare”, fără garanții implicite, în limitele
                permise de lege.
              </Text>
            </Section>

            <Section title="10. Confidențialitate">
              <Text>
                Prelucrăm datele tale personale (nume, contact, adresă, istoricul comenzilor) pentru a furniza
                serviciul, conform legislației aplicabile privind protecția datelor (GDPR). Nu vindem datele
                tale terților.
              </Text>
            </Section>

            <Section title="11. Modificări ale Termenilor">
              <Text>
                Putem actualiza acești Termeni periodic. Versiunea în vigoare este cea publicată pe această
                pagină. Continuarea utilizării Platformei după publicarea modificărilor reprezintă acceptarea
                acestora.
              </Text>
            </Section>

            <Section title="12. Lege aplicabilă și contact">
              <Text>
                Acești Termeni sunt guvernați de legea română, iar eventualele litigii vor fi soluționate de
                instanțele competente din Iași. Pentru întrebări legate de acești Termeni, ne poți contacta la{" "}
                <Anchor href="mailto:contact@sprintr.ro">contact@sprintr.ro</Anchor>.
              </Text>
            </Section>

            <Text fz="sm" c="dimmed">
              Document cu titlu informativ, ce poate fi revizuit juridic înainte de lansarea comercială.
            </Text>
          </Stack>
        </Container>
      </Box>

      <SiteFooter />
    </Box>
  );
}
