import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/features/auth/services/sessionService";
import { listTurnos, getTurnoAbierto } from "@/repositories/cajaTurnosRepository";
import { VentasTable } from "@/features/ventas/components/VentasTable";

// Historial de ventas para el cajero -- sin el botón "Anular venta" (exclusivo de
// /admin/ventas). La RLS de `ventas`/`caja_turnos` ya limita lo que puede ver un cajero (sus
// propias ventas y las del turno actualmente abierto), así que la consulta es la misma que en
// admin. RF del dueño: un vendedor (cajero) además solo puede VER lo del turno abierto, sin
// poder tocar ningún filtro ni exportar -- un administrador visitando esta misma pantalla (ej.
// para operar la caja él mismo) conserva el listado completo, igual que en /admin/ventas.
export default async function VentasCajeroPage() {
  const supabase = await createClient();
  const session = await getServerSession();
  const esCajero = session?.rol === "cajero";

  const [turnos, turnoAbierto] = await Promise.all([
    listTurnos(supabase),
    esCajero ? getTurnoAbierto(supabase) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Ventas</h1>
      {esCajero && !turnoAbierto ? (
        <p className="text-sm text-muted-foreground">No hay un turno de caja abierto.</p>
      ) : (
        <VentasTable
          turnos={turnos}
          basePath="/pos/ventas"
          turnoBloqueadoId={esCajero ? turnoAbierto?.id : undefined}
        />
      )}
    </div>
  );
}
