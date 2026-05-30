import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-white px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-6xl font-bold text-brand-600 mb-4">SprintR</h1>
        <p className="text-xl text-gray-600 mb-8">
          Papetărie, printare și produse de birou livrate rapid în Iași.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/browse"
            className="px-8 py-3 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
          >
            Comandă acum
          </Link>
          <Link
            href="/register"
            className="px-8 py-3 border-2 border-brand-500 text-brand-600 rounded-xl font-semibold hover:bg-brand-50 transition-colors"
          >
            Înregistrează-te
          </Link>
        </div>
      </div>
    </main>
  );
}
