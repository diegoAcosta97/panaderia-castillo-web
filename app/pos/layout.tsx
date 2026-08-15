import { PosSidebar } from "@/features/layout/components/PosSidebar";

// Envuelve TODO /pos/** (incluyendo /pos/caja, que queda a propósito fuera del route group
// (operacion) porque ese layout exige turno abierto). Antes solo (operacion)/layout.tsx
// renderizaba el header, así que /pos/caja se quedaba sin navegación.
export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh">
      <PosSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
