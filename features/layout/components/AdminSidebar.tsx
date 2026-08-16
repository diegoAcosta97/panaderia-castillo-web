"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  Lock,
  CalendarClock,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  { href: "/admin/pedidos", label: "Pedidos por encargo", icon: CalendarClock },
  { href: "/admin/control-stock", label: "Control de stock", icon: ClipboardList },
  { href: "/admin/ingresos-mercaderia", label: "Ingresos de mercadería", icon: PackagePlus },
  { href: "/admin/movimientos-stock", label: "Movimientos de stock", icon: History },
  { href: "/admin/bloqueo-caja", label: "Bloqueo de caja", icon: Lock },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

// En mobile el sidebar deja de ocupar ancho fijo (240px eran la mitad de la pantalla en un
// celular chico, sin dejar nada usable para el contenido) -- pasa a ser un panel superpuesto
// (`fixed`, fuera de pantalla por default) que se abre con el botón hamburguesa de la barra
// superior. En md: en adelante vuelve exactamente al comportamiento de siempre (estático,
// siempre visible, sin barra ni botón).
export function AdminSidebar({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => setOpen(false));
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 border-b border-sidebar-border bg-sidebar px-3 text-sidebar-foreground md:hidden print:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
        </Button>
        <ChefHat className="size-5 text-sidebar-primary" />
        <span className="text-sm leading-tight font-semibold">Panadería Castillo</span>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-in-out print:hidden",
          "md:static md:z-auto md:min-h-svh md:translate-x-0 md:transition-none",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-4 py-4">
          <div className="flex items-center gap-2">
            <ChefHat className="size-6 text-sidebar-primary" />
            <span className="text-sm leading-tight font-semibold">Panadería Castillo</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="size-4" />
          </Button>
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
    </>
  );
}
