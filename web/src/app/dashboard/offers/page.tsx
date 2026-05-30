import { Metadata } from "next";
import { OffersManager } from "@/components/dashboard/OffersManager";

export const metadata: Metadata = { title: "Oferte" };

export default function ShopOffersPage() {
  // TODO(BE): load/save offers from the offers table.
  return <OffersManager />;
}
