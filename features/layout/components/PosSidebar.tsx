"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  ClipboardList,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  { href: "/pos/control-stock", label: "Control de stock", icon: ClipboardList },
  { href: "/pos/pedidos", label: "Pedidos", icon: CalendarClock },
];

// Reemplaza PosTopBar: mismo patrón que AdminSidebar, pero con un fondo distinto (marrón cálido
// en vez del gris casi negro del admin) para que a simple vista se note quién está logueado, sin
// tener que desloguearse para chequear.
//
// Solo se renderiza para cajeros -- un admin en /pos ve su AdminSidebar de siempre (ver
// app/pos/layout.tsx), así nunca pierde el resto del menú mientras carga una venta.
//
// En mobile el sidebar deja de ocupar ancho fijo (240px eran la mitad de la pantalla en un
// celular chico) -- pasa a ser un panel superpuesto que se abre con el botón hamburguesa de la
// barra superior, mismo criterio que AdminSidebar. En md: en adelante vuelve exactamente al
// comportamiento de siempre (estático, siempre visible).
export function PosSidebar() {
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
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 border-b border-[#4a3520] bg-[#2b1b0e] px-3 text-[#fdfbf7] md:hidden print:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-[#fdfbf7] hover:bg-[#4a3520] hover:text-[#fdfbf7]"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
        </Button>
        <ChefHat className="size-5 text-[#e65100]" />
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
          "fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col bg-[#2b1b0e] text-[#fdfbf7] transition-transform duration-200 ease-in-out print:hidden",
          "md:static md:z-auto md:min-h-svh md:translate-x-0 md:transition-none",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[#4a3520] px-4 py-4">
          <div className="flex items-center gap-2">
            <ChefHat className="size-6 text-[#e65100]" />
            <span className="text-sm leading-tight font-semibold">Panadería Castillo</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-[#fdfbf7] hover:bg-[#4a3520] hover:text-[#fdfbf7] md:hidden"
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
    </>
  );
}
