import { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard magazin" };

export default function ShopDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Comenzi noi", value: "0", color: "bg-orange-50 text-orange-600" },
          { label: "În procesare", value: "0", color: "bg-blue-50 text-blue-600" },
          { label: "Finalizate azi", value: "0", color: "bg-green-50 text-green-600" },
          { label: "Venituri azi", value: "0 RON", color: "bg-purple-50 text-purple-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-2">{label}</p>
            <p className={`text-3xl font-bold rounded-lg px-2 py-1 inline-block ${color}`}>{value}</p>
          </div>
        ))}
      </div>
      {/* TODO: recent orders table */}
    </div>
  );
}
