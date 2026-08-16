import { getServerSession } from "@/features/auth/services/sessionService";
import { PosSidebar } from "@/features/layout/components/PosSidebar";

// Envuelve TODO /pos/** (incluyendo /pos/caja, que queda a propósito fuera del route group
// (operacion) porque ese layout exige turno abierto). Antes solo (operacion)/layout.tsx
// renderizaba el header, así que /pos/caja se quedaba sin navegación.
//
// Un administrador SÍ puede entrar acá (ej. "Nueva venta" desde /admin/ventas -- no hay pantalla
// de venta separada para admin, usa la misma) -- se le pasa la sesión a PosSidebar para que
// muestre un link de vuelta al panel, así no queda "atrapado" en la navegación de cajero sin
// saber cómo volver.
export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  return (
    <div className="flex min-h-svh">
      <PosSidebar esAdmin={session?.rol === "administrador"} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
