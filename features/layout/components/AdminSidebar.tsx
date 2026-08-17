"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
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
  CirclePlus,
  ClipboardList,
  Settings,
  UserCog,
  HandCoins,
  History,
  PackagePlus,
  PackageX,
  PackageMinus,
  Tags,
  Lock,
  CalendarClock,
  Factory,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import type { Session } from "@/features/auth/types";

interface Seccion {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

interface Grupo {
  key: string;
  label: string;
  defaultOpen: boolean;
  secciones: Seccion[];
}

const INICIO: Seccion = { href: "/admin", label: "Inicio", icon: LayoutDashboard, exact: true };

// Agrupado por área de trabajo (no alfabético) -- con 20+ secciones una lista plana se volvía
// difícil de escanear. "Más" junta lo que se toca con poca frecuencia y arranca colapsado; el
// resto arranca expandido. Si la sección activa queda en un grupo colapsado, el efecto de abajo
// lo abre solo.
const GRUPOS: Grupo[] = [
  {
    key: "ventas",
    label: "Ventas",
    defaultOpen: true,
    secciones: [
      { href: "/pos", label: "Nueva venta", icon: CirclePlus },
      { href: "/admin/ventas", label: "Ventas", icon: ShoppingCart },
      { href: "/admin/pedidos", label: "Pedidos por encargo", icon: CalendarClock },
      { href: "/admin/caja", label: "Caja", icon: Wallet },
      { href: "/admin/ofertas", label: "Ofertas", icon: Percent },
      { href: "/admin/descuentos", label: "Descuentos", icon: Tag },
      { href: "/admin/bloqueo-caja", label: "Bloqueo de caja", icon: Lock },
    ],
  },
  {
    key: "stock",
    label: "Stock",
    defaultOpen: true,
    secciones: [
      { href: "/admin/productos", label: "Productos", icon: Package },
      { href: "/admin/control-stock", label: "Control de stock", icon: ClipboardList },
      { href: "/admin/ingresos-mercaderia", label: "Ingresos de mercadería", icon: PackagePlus },
      { href: "/admin/produccion", label: "Producción", icon: Factory },
      { href: "/admin/merma", label: "Merma", icon: PackageX },
      { href: "/admin/consumo-interno", label: "Consumo interno", icon: PackageMinus },
      { href: "/admin/etiquetas", label: "Etiquetas", icon: Tags },
      { href: "/admin/movimientos-stock", label: "Movimientos de stock", icon: History },
    ],
  },
  {
    key: "personal",
    label: "Personal",
    defaultOpen: true,
    secciones: [
      { href: "/admin/usuarios", label: "Usuarios", icon: Users },
      { href: "/admin/empleados", label: "Empleados", icon: UserCog },
      { href: "/admin/pagos-empleados", label: "Pagos a empleados", icon: HandCoins },
    ],
  },
  {
    key: "mas",
    label: "Más",
    defaultOpen: false,
    secciones: [
      { href: "/admin/proveedores", label: "Proveedores", icon: Truck },
      { href: "/admin/gastos", label: "Gastos", icon: Receipt },
      { href: "/admin/configuracion", label: "Configuración", icon: Settings },
    ],
  },
];

function esActivo(seccion: Seccion, pathname: string): boolean {
  return seccion.exact ? pathname === seccion.href : pathname.startsWith(seccion.href);
}

function SeccionLink({ seccion, activo }: { seccion: Seccion; activo: boolean }) {
  const Icon = seccion.icon;
  return (
    <Link
      href={seccion.href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        activo
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {seccion.label}
    </Link>
  );
}

// En mobile el sidebar deja de ocupar ancho fijo (240px eran la mitad de la pantalla en un
// celular chico, sin dejar nada usable para el contenido) -- pasa a ser un panel superpuesto
// (`fixed`, fuera de pantalla por default) que se abre con el botón hamburguesa de la barra
// superior. En md: en adelante vuelve exactamente al comportamiento de siempre (estático,
// siempre visible, sin barra ni botón).
//
// Esta misma sidebar se usa también dentro de /pos cuando quien está logueado es admin (ver
// app/pos/layout.tsx) -- así el admin no pierde el resto del menú al cargar una venta.
export function AdminSidebar({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [gruposAbiertos, setGruposAbiertos] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GRUPOS.map((g) => [g.key, g.defaultOpen])),
  );

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

  useEffect(() => {
    const grupoActivo = GRUPOS.find((g) => g.secciones.some((s) => esActivo(s, pathname)));
    if (!grupoActivo) return;
    Promise.resolve().then(() =>
      setGruposAbiertos((prev) => (prev[grupoActivo.key] ? prev : { ...prev, [grupoActivo.key]: true })),
    );
  }, [pathname]);

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

        <nav className="flex flex-1 flex-col gap-3 overflow-y-auto p-2">
          <div className="flex flex-col gap-0.5">
            <SeccionLink seccion={INICIO} activo={esActivo(INICIO, pathname)} />
          </div>

          {GRUPOS.map((grupo) => {
            const abierto = gruposAbiertos[grupo.key];
            return (
              <div key={grupo.key} className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() =>
                    setGruposAbiertos((prev) => ({ ...prev, [grupo.key]: !prev[grupo.key] }))
                  }
                  aria-expanded={abierto}
                  className="flex items-center justify-between rounded-lg px-3 py-1 text-xs font-semibold tracking-wide text-sidebar-foreground/50 uppercase transition-colors hover:text-sidebar-foreground/80"
                >
                  {grupo.label}
                  <ChevronDown className={cn("size-3.5 transition-transform", !abierto && "-rotate-90")} />
                </button>
                {abierto && (
                  <div className="flex flex-col gap-0.5">
                    {grupo.secciones.map((seccion) => (
                      <SeccionLink
                        key={seccion.href}
                        seccion={seccion}
                        activo={esActivo(seccion, pathname)}
                      />
                    ))}
                  </div>
                )}
              </div>
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
