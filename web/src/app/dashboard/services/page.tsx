import { Metadata } from "next";
import { Plus } from "lucide-react";

export const metadata: Metadata = { title: "Servicii" };

export default function ShopServicesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Servicii</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 transition-colors">
          <Plus className="w-4 h-4" />
          Adaugă serviciu
        </button>
      </div>
      {/* TODO: list services with service option builder */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
        Nu ai adăugat servicii încă. Adaugă servicii pentru a permite clienților să comande.
      </div>
    </div>
  );
}
