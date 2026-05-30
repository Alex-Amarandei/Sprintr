import Link from "next/link";
import { ShoppingBag, Search, User } from "lucide-react";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/browse" className="text-2xl font-bold text-brand-600">
            SprintR
          </Link>
          <div className="flex-1 max-w-md mx-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="search"
                placeholder="Caută magazine sau servicii..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/orders" className="relative">
              <ShoppingBag className="w-6 h-6 text-gray-600 hover:text-brand-600" />
            </Link>
            <Link href="/profile">
              <User className="w-6 h-6 text-gray-600 hover:text-brand-600" />
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
