import { createClient } from "@/lib/supabase/server";
import { listTurnos } from "@/repositories/cajaTurnosRepository";
import { VentasTable } from "@/features/ventas/components/VentasTable";

// Historial de ventas para el cajero -- sin el botón "Anular venta" (exclusivo de
// /admin/ventas). La RLS de `ventas`/`caja_turnos` ya limita lo que puede ver un cajero (sus
// propias ventas y las del turno actualmente abierto), así que la consulta es la misma que en
// admin.
export default async function VentasCajeroPage() {
  const supabase = await createClient();
  const turnos = await listTurnos(supabase);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Ventas</h1>
      <VentasTable turnos={turnos} basePath="/pos/ventas" />
    </div>
  );
}
