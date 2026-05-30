import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Autentificare" };

export default function LoginPage() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Bun venit înapoi</h1>
      <p className="text-gray-500 mb-8">Autentifică-te în contul tău SprintR</p>

      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="email@exemplu.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Parolă
          </label>
          <input
            type="password"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="••••••••"
          />
        </div>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-brand-600 hover:underline">
            Ai uitat parola?
          </Link>
        </div>
        <button
          type="submit"
          className="w-full py-3 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
        >
          Autentifică-te
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Nu ai cont?{" "}
        <Link href="/register" className="text-brand-600 font-medium hover:underline">
          Înregistrează-te
        </Link>
      </p>
    </div>
  );
}
