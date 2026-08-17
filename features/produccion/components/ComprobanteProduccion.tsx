import type { Produccion, ProduccionItem } from "@/repositories/produccionRepository";
import type { ConfiguracionNegocio } from "@/repositories/configuracionRepository";

// Pedido de producción imprimible, para entregarle a quien lo va a hacer -- mismo patrón que
// Comprobante (E9-1): sin librería de PDF, `window.print()` cubre "descargable/imprimible".
export function ComprobanteProduccion({
  produccion,
  items,
  configuracion,
  empleadoNombre,
  nombreProducto,
}: {
  produccion: Produccion;
  items: ProduccionItem[];
  configuracion: ConfiguracionNegocio;
  empleadoNombre: string;
  nombreProducto: (id: string) => string;
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
      </header>

      <div className="border-t border-dashed pt-2 text-sm">
        <p className="text-base font-semibold">Pedido de producción</p>
        <p>Responsable: {empleadoNombre}</p>
        <p>
          Fecha de pedido:{" "}
          {new Date(`${produccion.fecha_pedido}T00:00:00`).toLocaleDateString("es-AR")}
        </p>
        <p>
          Fecha de entrega:{" "}
          {new Date(`${produccion.fecha_entrega}T00:00:00`).toLocaleDateString("es-AR")}
        </p>
        {produccion.observaciones && <p>Observaciones: {produccion.observaciones}</p>}
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-1 font-medium">Producto</th>
            <th className="py-1 text-right font-medium">Cantidad pedida</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-dashed">
              <td className="py-1">{nombreProducto(item.producto_id)}</td>
              <td className="py-1 text-right">{item.cantidad_pedida}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
