import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getShopProduct } from "@/lib/catalog/products";
import { ProductEditor } from "@/components/dashboard/ProductEditor";

export const metadata: Metadata = { title: "Editează produs" };

interface Props {
  params: Promise<{ productId: string }>;
}

export default async function EditProductPage({ params }: Props) {
  const { productId } = await params;
  const data = await getShopProduct(productId);
  if (!data) notFound();
  const { shopId, item } = data;

  const qtyField = item.fields.find(
    (f) => f.type === "number" && "unit" in f && f.unit
  );

  return (
    <ProductEditor
      mode="edit"
      shopId={shopId}
      productId={item.id}
      initial={{
        name: item.title,
        description: item.description ?? "",
        basePrice: item.base_price,
        unit: (qtyField && "unit" in qtyField && qtyField.unit) || "buc",
        sku: "",
        inStock: item.is_active,
      }}
    />
  );
}
