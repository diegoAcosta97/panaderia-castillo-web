import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTurnoAbierto } from "@/repositories/cajaTurnosRepository";
import { getConfiguracionNegocio } from "@/repositories/configuracionRepository";
import {
  listBloqueoCajaProductos,
  getConteoBloqueoCajaPorTurno,
} from "@/repositories/bloqueoCajaRepository";
import { getProductosByIds } from "@/repositories/productosRepository";
import { ConteoBloqueoCajaForm } from "@/features/bloqueo-caja/components/ConteoBloqueoCajaForm";

export default async function ConteoBloqueoCajaPage() {
  const supabase = await createClient();
  const turno = await getTurnoAbierto(supabase);
  if (!turno) redirect("/pos/caja");

  const [configuracion, filas, conteo] = await Promise.all([
    getConfiguracionNegocio(supabase),
    listBloqueoCajaProductos(supabase),
    getConteoBloqueoCajaPorTurno(supabase, turno.id),
  ]);

  // Si el bloqueo no está activo, no hay productos configurados, o ya se contó -- no hay nada
  // que hacer acá, de vuelta al cierre normal.
  if (!configuracion.bloqueo_caja_activo || filas.length === 0 || conteo) {
    redirect("/pos/caja/cierre");
  }

  const productos = await getProductosByIds(
    supabase,
    filas.map((f) => f.producto_id),
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Control sorpresivo</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          Antes de cerrar tu turno, contá el stock de estos productos. No afecta el stock del
          sistema, solo queda registrado para que lo revise el administrador.
        </p>
      </div>
      <ConteoBloqueoCajaForm turnoId={turno.id} productos={productos} />
    </div>
  );
}
