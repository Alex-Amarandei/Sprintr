import Link from "next/link";
import { Bike, Wallet } from "lucide-react";

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/deliveries" className="text-2xl font-bold text-brand-600">
            SprintR
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/deliveries" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand-600">
              <Bike className="w-5 h-5" />
              Livrări
            </Link>
            <Link href="/earnings" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand-600">
              <Wallet className="w-5 h-5" />
              Câștiguri
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
