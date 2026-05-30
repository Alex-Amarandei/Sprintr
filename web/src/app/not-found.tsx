import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <h1 className="text-8xl font-bold text-brand-500 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">Pagina nu a fost găsită.</p>
      <Link
        href="/"
        className="px-6 py-3 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
      >
        Înapoi acasă
      </Link>
    </div>
  );
}
