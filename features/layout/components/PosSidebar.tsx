"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChefHat,
  ShoppingCart,
  Wallet,
  Receipt,
  Tag,
  PackageX,
  PackageMinus,
  PackagePlus,
  CalendarClock,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/features/auth/components/LogoutButton";

const SECCIONES = [
  { href: "/pos", label: "Venta", icon: ShoppingCart, exact: true },
  { href: "/pos/caja", label: "Caja", icon: Wallet },
  { href: "/pos/ventas", label: "Ventas", icon: History },
  { href: "/pos/gastos", label: "Gastos", icon: Receipt },
  { href: "/pos/etiquetas", label: "Etiquetas", icon: Tag },
  { href: "/pos/merma", label: "Merma", icon: PackageX },
  { href: "/pos/consumo-interno", label: "Consumo interno", icon: PackageMinus },
  { href: "/pos/ingresos-mercaderia", label: "Ingreso de mercadería", icon: PackagePlus },
  { href: "/pos/pedidos", label: "Pedidos", icon: CalendarClock },
];

// Reemplaza PosTopBar: mismo patrón que AdminSidebar, pero con un fondo distinto (marrón cálido
// en vez del gris casi negro del admin) para que a simple vista se note quién está logueado, sin
// tener que desloguearse para chequear.
export function PosSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-svh w-60 shrink-0 flex-col bg-[#2b1b0e] text-[#fdfbf7] print:hidden">
      <div className="flex items-center gap-2 border-b border-[#4a3520] px-4 py-4">
        <ChefHat className="size-6 text-[#e65100]" />
        <span className="text-sm leading-tight font-semibold">Panadería Castillo</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {SECCIONES.map(({ href, label, icon: Icon, exact }) => {
          const activo = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activo
                  ? "bg-[#e65100] text-white"
                  : "text-[#fdfbf7]/80 hover:bg-[#4a3520] hover:text-[#fdfbf7]",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#4a3520] p-3 text-foreground">
        <LogoutButton />
      </div>
    </aside>
  );
}
