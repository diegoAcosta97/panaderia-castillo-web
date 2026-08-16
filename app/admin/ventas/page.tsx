import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listTurnos } from "@/repositories/cajaTurnosRepository";
import { VentasTable } from "@/features/ventas/components/VentasTable";
import { buttonVariants } from "@/components/ui/button";

export default async function VentasHistorialPage() {
  const supabase = await createClient();
  const turnos = await listTurnos(supabase);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ventas</h1>
        {/* /pos ya exige turno de caja abierto (E4-2) -- si el admin no tiene uno, lo manda a
            abrirlo primero, mismo camino que recorre un cajero. No hay guard de rol en /pos: un
            administrador ya podía vender, esto solo le da un acceso directo desde el historial. */}
        <Link href="/pos" className={buttonVariants()}>
          Nueva venta
        </Link>
      </div>
      <VentasTable turnos={turnos} />
    </div>
  );
}
