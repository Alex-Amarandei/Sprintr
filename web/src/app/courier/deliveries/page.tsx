import { Metadata } from "next";

export const metadata: Metadata = { title: "Livrările mele" };

export default function DeliveriesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Livrări disponibile</h1>
      {/* TODO: available delivery jobs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
        Nu există livrări disponibile momentan.
      </div>
    </div>
  );
}
