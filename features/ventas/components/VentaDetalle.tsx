import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AnularVentaDialog } from "@/features/ventas/components/AnularVentaDialog";
import { formatearMoneda } from "@/lib/format";
import type {
  Venta,
  RenglonVenta,
  VentaOfertaAplicada,
  VentaDescuentoAplicado,
  VentaMedioPago,
} from "@/repositories/ventasRepository";

const ETIQUETA_MEDIO: Record<string, string> = {
  efectivo: "Efectivo",
  mercado_pago: "Mercado Pago",
  sena_pedido: "Seña (pedido por encargo)",
  tarjeta_debito: "Tarjeta de débito",
  tarjeta_credito: "Tarjeta de crédito",
};

// Compartido entre /admin/ventas/[id] y /pos/ventas/[id] -- la única diferencia entre admin y
// cajero es que el cajero no puede anular una venta (puedeAnular=false), el resto del detalle es
// idéntico. La RLS de `ventas` ya limita qué filas puede leer un cajero (las suyas o las del
// turno abierto), así que no hace falta duplicar esa lógica acá.
export function VentaDetalle({
  venta,
  renglones,
  mediosPago,
  ofertasAplicadas,
  descuentosAplicados,
  nombreProducto,
  nombreOferta,
  nombreDescuento,
  puedeAnular,
}: {
  venta: Venta;
  renglones: RenglonVenta[];
  mediosPago: VentaMedioPago[];
  ofertasAplicadas: VentaOfertaAplicada[];
  descuentosAplicados: VentaDescuentoAplicado[];
  nombreProducto: (id: string) => string;
  nombreOferta: (id: string) => string;
  nombreDescuento: (id: string) => string;
  puedeAnular: boolean;
}) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Comprobante N.º {venta.numero_comprobante}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(venta.fecha).toLocaleString("es-AR")} · {venta.estado}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/pos/comprobante/${venta.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline"
          >
            Ver comprobante
          </Link>
          {puedeAnular && venta.estado === "completada" && (
            <AnularVentaDialog ventaId={venta.id} />
          )}
        </div>
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
              <TableCell>{formatearMoneda(r.precio_unitario_snapshot)}</TableCell>
              <TableCell>{formatearMoneda(r.subtotal)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatearMoneda(venta.subtotal)}</span>
        </div>
        {ofertasAplicadas.map((o) => (
          <div key={o.id} className="flex justify-between text-muted-foreground">
            <span>
              Combo: {nombreOferta(o.oferta_id)} x{o.veces_aplicada}
            </span>
            <span>-{formatearMoneda(o.monto_beneficio)}</span>
          </div>
        ))}
        {descuentosAplicados.map((d) => (
          <div key={d.id} className="flex justify-between text-muted-foreground">
            <span>Descuento: {nombreDescuento(d.descuento_id)}</span>
            <span>-{formatearMoneda(d.monto_aplicado)}</span>
          </div>
        ))}
        <div className="mt-1 flex justify-between border-t pt-1 text-base font-semibold">
          <span>Total</span>
          <span>{formatearMoneda(venta.total)}</span>
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
              <span>{formatearMoneda(m.monto)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
