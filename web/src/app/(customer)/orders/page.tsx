import { Metadata } from "next";

export const metadata: Metadata = { title: "Comenzile mele" };

export default function CustomerOrdersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Comenzile mele</h1>
      {/* TODO: fetch orders from Supabase */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
        Nu ai comenzi încă.
      </div>
    </div>
  );
}
