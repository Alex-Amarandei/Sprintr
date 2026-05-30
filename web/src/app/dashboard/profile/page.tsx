import { Metadata } from "next";
import { ProfileEditor } from "@/components/dashboard/ProfileEditor";

export const metadata: Metadata = { title: "Profil magazin" };

export default function ShopProfilePage() {
  // TODO(BE): load/save shop profile (name, description, contact, schedule) from `shops`.
  return <ProfileEditor />;
}
