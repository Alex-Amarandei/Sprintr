import { Metadata } from "next";

export const metadata: Metadata = { title: "Detalii comandă" };

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function OrderDetailPage({ params }: Props) {
  const { orderId } = await params;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Comanda #{orderId.slice(0, 8)}</h1>
      {/* TODO: fetch order details from Supabase */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
        Detaliile comenzii vor apărea aici.
      </div>
    </div>
  );
}
