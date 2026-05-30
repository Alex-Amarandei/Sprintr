import { Metadata } from "next";

export const metadata: Metadata = { title: "Magazin" };

interface Props {
  params: Promise<{ shopId: string }>;
}

export default async function ShopDetailPage({ params }: Props) {
  const { shopId } = await params;

  return (
    <div>
      <p className="text-gray-400 text-sm mb-6">Shop ID: {shopId}</p>
      {/* TODO: fetch shop details, services and products from Supabase */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
        Detaliile magazinului vor apărea aici.
      </div>
    </div>
  );
}
