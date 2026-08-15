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
  CalendarClock,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { cn } from "@/lib/utils";

const SECCIONES = [
  { href: "/pos", label: "Venta", icon: ShoppingCart, exact: true },
  { href: "/pos/caja", label: "Caja", icon: Wallet },
  { href: "/pos/gastos", label: "Gastos", icon: Receipt },
  { href: "/pos/etiquetas", label: "Etiquetas", icon: Tag },
  { href: "/pos/merma", label: "Merma", icon: PackageX },
  { href: "/pos/consumo-interno", label: "Consumo interno", icon: PackageMinus },
  { href: "/pos/pedidos", label: "Pedidos", icon: CalendarClock },
];

export function PosTopBar() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-2 print:hidden">
      <div className="flex items-center gap-1">
        <ChefHat className="mr-1 size-5 text-primary" />
        {SECCIONES.map(({ href, label, icon: Icon, exact }) => {
          const activo = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(buttonVariants({ variant: activo ? "default" : "ghost", size: "sm" }))}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </div>
      <LogoutButton />
    </header>
  );
}
