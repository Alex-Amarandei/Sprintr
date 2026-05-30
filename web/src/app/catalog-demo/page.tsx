import { Metadata } from "next";
import { Alert, Container } from "@mantine/core";
import { emptyDocument } from "@/lib/catalog/schema";
import { CatalogBuilder } from "@/components/catalog/CatalogBuilder";

export const metadata: Metadata = { title: "Catalog (demo local)" };

// Public, login-free sandbox for testing the catalog builder UI.
// localMode = no Supabase calls; "Salvează" only validates + prints the JSON.
export default function CatalogDemoPage() {
  return (
    <Container size="lg" py="xl">
      <Alert color="yellow" variant="light" mb="lg" title="Mod demo local">
        Pagină de test, fără autentificare. Nimic nu se trimite la backend —
        „Salvează" doar validează documentul și îl afișează ca JSON mai jos (și
        în consolă).
      </Alert>
      <CatalogBuilder
        shopId="local"
        initialDraft={null}
        activeDocument={emptyDocument}
        localMode
      />
    </Container>
  );
}
