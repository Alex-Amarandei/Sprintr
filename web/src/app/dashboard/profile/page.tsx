import { Metadata } from "next";
import { getMyShop } from "@/lib/orders/queries";
import { ProfileEditor } from "@/components/dashboard/ProfileEditor";

export const metadata: Metadata = { title: "Profil magazin" };

export default async function ShopProfilePage() {
  const shop = await getMyShop();
  return (
    <ProfileEditor
      shopId={shop?.id ?? null}
      initial={{
        name: shop?.name ?? "",
        description: shop?.description ?? "",
        phone: shop?.phone ?? "",
        address: shop?.address ?? "",
      }}
    />
  );
}
