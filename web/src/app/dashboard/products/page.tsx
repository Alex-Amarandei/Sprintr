import { Metadata } from "next";
import { Plus } from "lucide-react";

export const metadata: Metadata = { title: "Produse" };

export default function ShopProductsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Produse</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 transition-colors">
          <Plus className="w-4 h-4" />
          Adaugă produs
        </button>
      </div>
      {/* TODO: product grid with Supabase Storage images */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
        Nu ai adăugat produse încă.
      </div>
    </div>
  );
}
