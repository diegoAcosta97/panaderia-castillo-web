import type {
  Venta,
  RenglonVenta,
  VentaOfertaAplicada,
  VentaDescuentoAplicado,
  VentaMedioPago,
} from "@/repositories/ventasRepository";
import type { ConfiguracionNegocio } from "@/repositories/configuracionRepository";

const ETIQUETA_MEDIO: Record<string, string> = {
  efectivo: "Efectivo",
  mercado_pago: "Mercado Pago",
};

export function Comprobante({
  venta,
  renglones,
  ofertasAplicadas,
  descuentosAplicados,
  mediosPago,
  configuracion,
  nombreProducto,
  nombreOferta,
  nombreDescuento,
}: {
  venta: Venta;
  renglones: RenglonVenta[];
  ofertasAplicadas: VentaOfertaAplicada[];
  descuentosAplicados: VentaDescuentoAplicado[];
  mediosPago: VentaMedioPago[];
  configuracion: ConfiguracionNegocio;
  nombreProducto: (id: string) => string;
  nombreOferta: (id: string) => string;
  nombreDescuento: (id: string) => string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-6 text-foreground print:max-w-none print:p-0">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-lg font-semibold">{configuracion.nombre_comercial}</h1>
        {configuracion.direccion && (
          <p className="text-sm text-muted-foreground">{configuracion.direccion}</p>
        )}
        {configuracion.telefono && (
          <p className="text-sm text-muted-foreground">Tel: {configuracion.telefono}</p>
        )}
        {configuracion.cuit && (
          <p className="text-sm text-muted-foreground">CUIT: {configuracion.cuit}</p>
        )}
      </header>

      <div className="border-t border-dashed pt-2 text-sm">
        <p>Comprobante N.º {venta.numero_comprobante}</p>
        <p>{new Date(venta.fecha).toLocaleString("es-AR")}</p>
        {venta.estado === "anulada" && (
          <p className="font-semibold text-destructive">
            ANULADA
            {venta.fecha_anulacion && ` — ${new Date(venta.fecha_anulacion).toLocaleString("es-AR")}`}
            {venta.motivo_anulacion && ` (${venta.motivo_anulacion})`}
          </p>
        )}
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-1 font-medium">Producto</th>
            <th className="py-1 text-right font-medium">Cant.</th>
            <th className="py-1 text-right font-medium">Precio</th>
            <th className="py-1 text-right font-medium">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {renglones.map((r) => (
            <tr key={r.id} className="border-b border-dashed">
              <td className="py-1">{nombreProducto(r.producto_id)}</td>
              <td className="py-1 text-right">{r.cantidad}</td>
              <td className="py-1 text-right">${r.precio_unitario_snapshot}</td>
              <td className="py-1 text-right">${r.subtotal}</td>
            </tr>
          ))}
        </tbody>
      </table>

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

      <div className="border-t border-dashed pt-2 text-sm">
        <h2 className="mb-1 font-medium">Medios de pago</h2>
        <ul className="flex flex-col gap-1">
          {mediosPago.map((m) => (
            <li key={m.id} className="flex justify-between">
              <span>{ETIQUETA_MEDIO[m.medio_pago] ?? m.medio_pago}</span>
              <span>${m.monto}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
