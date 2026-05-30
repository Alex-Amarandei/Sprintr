import { Metadata } from "next";

export const metadata: Metadata = { title: "Magazine" };

export default function BrowsePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Magazine în Iași</h1>
      <p className="text-gray-500 mb-8">Alege un magazin și plasează comanda</p>

      {/* TODO: fetch shops from Supabase */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-gray-400">
          Magazinele vor apărea aici
        </div>
      </div>
    </div>
  );
}
