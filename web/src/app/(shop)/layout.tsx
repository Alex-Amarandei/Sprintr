import Link from "next/link";
import { LayoutDashboard, ShoppingBag, Package, Wrench, Tag, User } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Comenzi", icon: ShoppingBag },
  { href: "/products", label: "Produse", icon: Package },
  { href: "/services", label: "Servicii", icon: Wrench },
  { href: "/offers", label: "Oferte", icon: Tag },
  { href: "/profile", label: "Profil", icon: User },
];

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col fixed inset-y-0">
        <div className="p-6 border-b border-gray-100">
          <Link href="/dashboard" className="text-2xl font-bold text-brand-600">
            SprintR
          </Link>
          <p className="text-xs text-gray-400 mt-1">Panou magazin</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-600 hover:bg-brand-50 hover:text-brand-600 transition-colors text-sm font-medium"
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
