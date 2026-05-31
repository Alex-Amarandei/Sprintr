import { Metadata } from "next";
import { loadShopProfile } from "@/lib/shop/queries";
import { ProfileEditor } from "@/components/dashboard/ProfileEditor";

export const metadata: Metadata = { title: "Profil magazin" };

export default async function ShopProfilePage() {
  const shop = await loadShopProfile();
  return (
    <ProfileEditor
      shopId={shop?.shopId ?? null}
      initial={{
        name: shop?.name ?? "",
        description: shop?.description ?? "",
        phone: shop?.phone ?? "",
        email: shop?.email ?? "",
        address: shop?.address ?? "",
        defaultEtaMinutes: shop?.defaultEtaMinutes ?? null,
      }}
      schedule={shop?.schedule ?? null}
      logoPath={shop?.logoPath ?? null}
      bannerPath={shop?.bannerPath ?? null}
      meta={{ itemCount: shop?.itemCount ?? 0 }}
    />
  );
}
