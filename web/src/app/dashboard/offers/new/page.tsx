import { Metadata } from "next";
import { PromotionEditor } from "@/components/dashboard/PromotionEditor";

export const metadata: Metadata = { title: "Promoție nouă" };

export default function NewPromotionPage() {
  return <PromotionEditor />;
}
