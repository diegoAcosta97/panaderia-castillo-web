import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProduccion, getProduccionItems } from "@/repositories/produccionRepository";
import { getConfiguracionNegocio } from "@/repositories/configuracionRepository";
import { listProductos } from "@/repositories/productosRepository";
import { listEmpleados } from "@/repositories/empleadosRepository";
import { ComprobanteProduccion } from "@/features/produccion/components/ComprobanteProduccion";
import { BotonImprimirProduccion } from "@/features/produccion/components/BotonImprimirProduccion";

// E16: pedido de producción imprimible, para el empleado que lo va a hacer -- mismo patrón que
// app/pos/comprobante/[ventaId]/page.tsx (E9-1).
export default async function ComprobanteProduccionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const produccion = await getProduccion(supabase, id);
  if (!produccion) notFound();

  const [items, configuracion, productos, empleados] = await Promise.all([
    getProduccionItems(supabase, id),
    getConfiguracionNegocio(supabase),
    listProductos(supabase),
    listEmpleados(supabase),
  ]);

  const nombreProducto = (productoId: string) =>
    productos.find((p) => p.id === productoId)?.nombre ?? "—";
  const empleadoNombre = empleados.find((e) => e.id === produccion.empleado_id)?.nombre ?? "—";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end p-6 pb-0 print:hidden">
        <BotonImprimirProduccion />
      </div>
      <ComprobanteProduccion
        produccion={produccion}
        items={items}
        configuracion={configuracion}
        empleadoNombre={empleadoNombre}
        nombreProducto={nombreProducto}
      />
    </div>
  );
}
