import { Metadata } from "next";
import { notFound } from "next/navigation";
import { sampleCatalog } from "@/lib/catalog/samples";
import { ProductEditor } from "@/components/dashboard/ProductEditor";

export const metadata: Metadata = { title: "Editează produs" };

interface Props {
  params: Promise<{ productId: string }>;
}

export default async function EditProductPage({ params }: Props) {
  const { productId } = await params;
  // TODO(BE): load the product from the shop's catalog version.
  const item = sampleCatalog.find((i) => i.id === productId);
  if (!item) notFound();

  const qtyField = item.fields.find(
    (f) => f.type === "number" && "unit" in f && f.unit
  );

  return (
    <ProductEditor
      mode="edit"
      initial={{
        name: item.title,
        description: item.description ?? "",
        basePrice: item.base_price,
        unit: (qtyField && "unit" in qtyField && qtyField.unit) || "buc",
        sku: "",
        inStock: true,
      }}
    />
  );
}
