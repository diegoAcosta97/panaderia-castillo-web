import { createClient } from "@/lib/supabase/server";
import { listTurnos } from "@/repositories/cajaTurnosRepository";
import { VentasTable } from "@/features/ventas/components/VentasTable";

export default async function VentasHistorialPage() {
  const supabase = await createClient();
  const turnos = await listTurnos(supabase);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Ventas</h1>
      <VentasTable turnos={turnos} />
    </div>
  );
}
