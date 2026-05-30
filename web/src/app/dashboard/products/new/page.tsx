import { Metadata } from "next";
import { ProductEditor } from "@/components/dashboard/ProductEditor";

export const metadata: Metadata = { title: "Adaugă produs" };

export default function NewProductPage() {
  return <ProductEditor mode="new" />;
}
