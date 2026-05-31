import { Metadata } from "next";
import { Paper, Stack, Text, Title } from "@mantine/core";
import { getShops } from "@/lib/catalog/shops";
import { createClient } from "@/lib/supabase/server";
import { ShopResults } from "@/components/shop/ShopResults";
import { roCount } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Magazine" };

export default async function BrowsePage() {
  // Greeting personalisation (browse is public → user may be null).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let firstName = "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    firstName = profile?.full_name?.split(" ")[0] ?? "";
  }

  const shops = await getShops();
  const openCount = shops.filter((s) => s.isOpen ?? true).length;

  return (
    <Stack gap="xl">
      {/* Welcome band */}
      <Paper
        radius="lg"
        p="xl"
        style={{
          background:
            "linear-gradient(120deg, var(--mantine-color-ink-9), var(--mantine-color-slate-7))",
        }}
      >
        <div>
          <Title order={2} c="white">
            Bună{firstName ? `, ${firstName}` : ""} 👋
          </Title>
          <Text c="gray.4" mt={4}>
            {roCount(openCount, "magazin", "magazine")} {openCount === 1 ? "este deschis" : "sunt deschise"} acum în Iași. De unde comanzi azi?
          </Text>
        </div>
      </Paper>

      {/* Shop grid — client-side, debounced search via the header input */}
      <ShopResults shops={shops} />
    </Stack>
  );
}
