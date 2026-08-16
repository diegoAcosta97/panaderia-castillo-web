import { getServerSession } from "@/features/auth/services/sessionService";
import { PosSidebar } from "@/features/layout/components/PosSidebar";
import { AdminSidebar } from "@/features/layout/components/AdminSidebar";

// Envuelve TODO /pos/** (incluyendo /pos/caja, que queda a propósito fuera del route group
// (operacion) porque ese layout exige turno abierto). Antes solo (operacion)/layout.tsx
// renderizaba el header, así que /pos/caja se quedaba sin navegación.
//
// Un administrador SÍ puede entrar acá (ej. "Nueva venta" desde /admin/ventas -- no hay pantalla
// de venta separada para admin, usa la misma). Antes se le mostraba PosSidebar con un link de
// vuelta al panel, pero eso le hacía perder el resto del menú de admin mientras cargaba la venta.
// Ahora directamente ve su AdminSidebar de siempre (que ya incluye "Nueva venta" apuntando acá).
export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  const esAdmin = session?.rol === "administrador";

  return (
    <div className="flex min-h-svh">
      {esAdmin ? <AdminSidebar session={session} /> : <PosSidebar />}
      {/* pt-14 compensa la barra fija con el botón hamburguesa que la sidebar muestra en
          mobile (md:hidden); en desktop la sidebar es estática y no hace falta. */}
      <main className="min-w-0 flex-1 pt-14 md:pt-0">{children}</main>
    </div>
  );
}
