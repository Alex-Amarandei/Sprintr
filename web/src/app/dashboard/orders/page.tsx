import { Metadata } from "next";

export const metadata: Metadata = { title: "Comenzi primite" };

export default function ShopOrdersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Comenzi primite</h1>
      {/* TODO: fetch shop orders from Supabase */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
        Nu există comenzi deocamdată.
      </div>
    </div>
  );
}
