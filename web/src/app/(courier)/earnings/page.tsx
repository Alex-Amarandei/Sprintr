import { Metadata } from "next";

export const metadata: Metadata = { title: "Câștiguri" };

export default function EarningsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Câștiguri</h1>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
        Istoricul câștigurilor va apărea aici.
      </div>
    </div>
  );
}
