"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChefHat,
  LayoutDashboard,
  Package,
  Users,
  Wallet,
  Truck,
  Receipt,
  Percent,
  Tag,
  ShoppingCart,
  ClipboardList,
  Settings,
  UserCog,
  HandCoins,
  History,
  PackagePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import type { Session } from "@/features/auth/types";

const SECCIONES = [
  { href: "/admin", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/caja", label: "Caja", icon: Wallet },
  { href: "/admin/proveedores", label: "Proveedores", icon: Truck },
  { href: "/admin/gastos", label: "Gastos", icon: Receipt },
  { href: "/admin/empleados", label: "Empleados", icon: UserCog },
  { href: "/admin/pagos-empleados", label: "Pagos a empleados", icon: HandCoins },
  { href: "/admin/ofertas", label: "Ofertas", icon: Percent },
  { href: "/admin/descuentos", label: "Descuentos", icon: Tag },
  { href: "/admin/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/admin/control-stock", label: "Control de stock", icon: ClipboardList },
  { href: "/admin/ingresos-mercaderia", label: "Ingresos de mercadería", icon: PackagePlus },
  { href: "/admin/movimientos-stock", label: "Movimientos de stock", icon: History },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

export function AdminSidebar({ session }: { session: Session | null }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-svh w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground print:hidden">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-4">
        <ChefHat className="size-6 text-sidebar-primary" />
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
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 border-t border-sidebar-border p-3 text-foreground">
        <p className="truncate px-1 text-xs text-sidebar-foreground/60">
          {session?.perfil.nombre_completo || session?.perfil.email} · {session?.rol}
        </p>
        <LogoutButton />
      </div>
    </aside>
  );
}
