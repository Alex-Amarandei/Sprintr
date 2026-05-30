import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Înregistrare" };

export default function RegisterPage() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Creează cont</h1>
      <p className="text-gray-500 mb-8">Alătură-te comunității SprintR</p>

      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nume complet</label>
          <input
            type="text"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="Ion Ionescu"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="email@exemplu.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
          <input
            type="tel"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="07xx xxx xxx"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tip cont</label>
          <select className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent">
            <option value="customer">Client</option>
            <option value="shop_owner">Proprietar magazin</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Parolă</label>
          <input
            type="password"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="Minim 8 caractere"
          />
        </div>
        <button
          type="submit"
          className="w-full py-3 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
        >
          Creează cont
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Ai deja cont?{" "}
        <Link href="/login" className="text-brand-600 font-medium hover:underline">
          Autentifică-te
        </Link>
      </p>
    </div>
  );
}
