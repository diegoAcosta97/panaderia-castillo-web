import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getVenta,
  getRenglonesVenta,
  getMediosPagoVenta,
  getOfertasAplicadas,
  getDescuentosAplicados,
} from "@/repositories/ventasRepository";
import { listProductos } from "@/repositories/productosRepository";
import { listOfertas } from "@/repositories/ofertasRepository";
import { listDescuentos } from "@/repositories/descuentosRepository";
import { VentaDetalle } from "@/features/ventas/components/VentaDetalle";

export default async function VentaDetalleCajeroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const venta = await getVenta(supabase, id);
  if (!venta) notFound();

  const [renglones, mediosPago, ofertasAplicadas, descuentosAplicados, productos, ofertas, descuentos] =
    await Promise.all([
      getRenglonesVenta(supabase, id),
      getMediosPagoVenta(supabase, id),
      getOfertasAplicadas(supabase, id),
      getDescuentosAplicados(supabase, id),
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
    <VentaDetalle
      venta={venta}
      renglones={renglones}
      mediosPago={mediosPago}
      ofertasAplicadas={ofertasAplicadas}
      descuentosAplicados={descuentosAplicados}
      nombreProducto={nombreProducto}
      nombreOferta={nombreOferta}
      nombreDescuento={nombreDescuento}
      puedeAnular={false}
    />
  );
}
