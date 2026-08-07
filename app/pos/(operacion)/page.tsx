import Link from "next/link";
import { getServerSession } from "@/features/auth/services/sessionService";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { buttonVariants } from "@/components/ui/button";

// Placeholder: el punto de venta real (armado de carrito, cobro, etc.) llega en EPIC 7 — esto
// solo prueba el flujo de login/redirección (EPIC 1/2) y el guard de turno de caja abierto
// (E4-2, ver app/pos/(operacion)/layout.tsx). Accesible para cajero y administrador (RF-10.1),
// sin guard de rol como /admin.
export default async function PosHome() {
  const session = await getServerSession();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div>
        <p className="text-lg font-medium">Punto de venta</p>
        <p className="text-muted-foreground text-sm">
          {session?.perfil.nombre_completo || session?.perfil.email} · {session?.rol}
        </p>
      </div>
      <div className="flex gap-2">
        <Link href="/pos/caja" className={buttonVariants({ variant: "outline" })}>
          Caja
        </Link>
        <Link href="/pos/gastos" className={buttonVariants({ variant: "outline" })}>
          Gastos
        </Link>
      </div>
      <LogoutButton />
    </div>
  );
}
