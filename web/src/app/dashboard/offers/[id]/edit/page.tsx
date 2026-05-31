import { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadCatalogEditor } from "@/lib/catalog/editor";
import { getShopOffers } from "@/lib/offers/queries";
import { PromotionEditor } from "@/components/dashboard/PromotionEditor";

export const metadata: Metadata = { title: "Editează promoția" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPromotionPage({ params }: Props) {
  const { id } = await params;
  const data = await loadCatalogEditor();
  if (!data || !data.canEdit) notFound();

  const offer = (await getShopOffers(data.shopId)).find((o) => o.id === id);
  if (!offer) notFound();

  return (
    <PromotionEditor
      shopId={data.shopId}
      items={data.activeDocument.items}
      categories={data.activeDocument.categories}
      offer={offer}
    />
  );
}
