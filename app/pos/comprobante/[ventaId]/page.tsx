import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getVenta,
  getRenglonesVenta,
  getMediosPagoVenta,
  getOfertasAplicadas,
  getDescuentosAplicados,
} from "@/repositories/ventasRepository";
import { getConfiguracionNegocio } from "@/repositories/configuracionRepository";
import { listProductos } from "@/repositories/productosRepository";
import { listOfertas } from "@/repositories/ofertasRepository";
import { listDescuentos } from "@/repositories/descuentosRepository";
import { Comprobante } from "@/features/ventas/components/Comprobante";
import { BotonImprimirComprobante } from "@/features/ventas/components/BotonImprimirComprobante";

// E9-1: fuera del route group (operacion) a propósito -- no depende de que haya un turno de
// caja abierto (se puede reimprimir un comprobante de cualquier momento, incluso con la caja ya
// cerrada). El acceso a los datos lo resuelve la RLS de cada tabla (dueño, administrador, o
// turno actualmente abierto), igual que en app/admin/ventas/[id]/page.tsx.
export default async function ComprobanteVentaPage({
  params,
}: {
  params: Promise<{ ventaId: string }>;
}) {
  const { ventaId } = await params;
  const supabase = await createClient();

  const venta = await getVenta(supabase, ventaId);
  if (!venta) notFound();

  const [
    renglones,
    mediosPago,
    ofertasAplicadas,
    descuentosAplicados,
    configuracion,
    productos,
    ofertas,
    descuentos,
  ] = await Promise.all([
    getRenglonesVenta(supabase, ventaId),
    getMediosPagoVenta(supabase, ventaId),
    getOfertasAplicadas(supabase, ventaId),
    getDescuentosAplicados(supabase, ventaId),
    getConfiguracionNegocio(supabase),
    listProductos(supabase),
    listOfertas(supabase),
    listDescuentos(supabase),
  ]);

  const nombreProducto = (productoId: string) =>
    productos.find((p) => p.id === productoId)?.nombre ?? "—";
  const nombreOferta = (ofertaId: string) => ofertas.find((o) => o.id === ofertaId)?.nombre ?? "—";
  const nombreDescuento = (descuentoId: string) =>
    descuentos.find((d) => d.id === descuentoId)?.nombre ?? "—";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end p-6 pb-0 print:hidden">
        <BotonImprimirComprobante />
      </div>
      <Comprobante
        venta={venta}
        renglones={renglones}
        ofertasAplicadas={ofertasAplicadas}
        descuentosAplicados={descuentosAplicados}
        mediosPago={mediosPago}
        configuracion={configuracion}
        nombreProducto={nombreProducto}
        nombreOferta={nombreOferta}
        nombreDescuento={nombreDescuento}
      />
    </div>
  );
}
