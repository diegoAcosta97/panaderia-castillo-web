import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTurnoAbierto } from "@/repositories/cajaTurnosRepository";
import { getConfiguracionNegocio } from "@/repositories/configuracionRepository";
import {
  listBloqueoCajaProductos,
  getConteoBloqueoCajaPorTurno,
} from "@/repositories/bloqueoCajaRepository";
import { CierreTurnoForm } from "@/features/caja/components/CierreTurnoForm";

export default async function CierreTurnoPage() {
  const supabase = await createClient();
  const turno = await getTurnoAbierto(supabase);
  if (!turno) redirect("/pos/caja");

  const [configuracion, productosBloqueo, conteo] = await Promise.all([
    getConfiguracionNegocio(supabase),
    listBloqueoCajaProductos(supabase),
    getConteoBloqueoCajaPorTurno(supabase, turno.id),
  ]);

  // E4-4: el gate real vive en cerrar_turno (SQL) -- este redirect es solo para no mostrarle al
  // cajero un formulario que igual va a rechazar el servidor.
  if (configuracion.bloqueo_caja_activo && productosBloqueo.length > 0 && !conteo) {
    redirect("/pos/caja/cierre/conteo");
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Cerrar turno</h1>
      <CierreTurnoForm turno={turno} />
    </div>
  );
}
