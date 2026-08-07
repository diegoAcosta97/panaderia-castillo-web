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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AnularVentaDialog } from "@/features/ventas/components/AnularVentaDialog";

const ETIQUETA_MEDIO: Record<string, string> = {
  efectivo: "Efectivo",
  mercado_pago: "Mercado Pago",
};

export default async function VentaDetallePage({
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
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Comprobante N.º {venta.numero_comprobante}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(venta.fecha).toLocaleString("es-AR")} · {venta.estado}
          </p>
        </div>
        {venta.estado === "completada" && <AnularVentaDialog ventaId={venta.id} />}
      </div>

      {venta.estado === "anulada" && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
          Anulada el {venta.fecha_anulacion && new Date(venta.fecha_anulacion).toLocaleString("es-AR")}
          {venta.motivo_anulacion && ` — Motivo: ${venta.motivo_anulacion}`}
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Subtotal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {renglones.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{nombreProducto(r.producto_id)}</TableCell>
              <TableCell>{r.cantidad}</TableCell>
              <TableCell>${r.precio_unitario_snapshot}</TableCell>
              <TableCell>${r.subtotal}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>${venta.subtotal}</span>
        </div>
        {ofertasAplicadas.map((o) => (
          <div key={o.id} className="flex justify-between text-muted-foreground">
            <span>
              Combo: {nombreOferta(o.oferta_id)} x{o.veces_aplicada}
            </span>
            <span>-${o.monto_beneficio}</span>
          </div>
        ))}
        {descuentosAplicados.map((d) => (
          <div key={d.id} className="flex justify-between text-muted-foreground">
            <span>Descuento: {nombreDescuento(d.descuento_id)}</span>
            <span>-${d.monto_aplicado}</span>
          </div>
        ))}
        <div className="mt-1 flex justify-between border-t pt-1 text-base font-semibold">
          <span>Total</span>
          <span>${venta.total}</span>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium">Medios de pago</h2>
        <ul className="text-sm">
          {mediosPago.map((m) => (
            <li key={m.id} className="flex justify-between">
              <span>
                {ETIQUETA_MEDIO[m.medio_pago] ?? m.medio_pago} ({m.estado_pago})
              </span>
              <span>${m.monto}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
