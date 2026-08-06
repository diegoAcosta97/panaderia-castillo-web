import { getServerSession } from "@/features/auth/services/sessionService";
import { LogoutButton } from "@/features/auth/components/LogoutButton";

// Placeholder: el punto de venta real (armado de carrito, cobro, etc.) llega en EPIC 7 — esto
// solo prueba el flujo de login/redirección de EPIC 1 y 2. Accesible para cajero y
// administrador (RF-10.1), sin guard de rol como /admin.
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
      <LogoutButton />
    </div>
  );
}
