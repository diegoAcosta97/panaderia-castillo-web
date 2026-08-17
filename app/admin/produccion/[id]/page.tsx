import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getProduccion,
  getProduccionItems,
} from "@/repositories/produccionRepository";
import { listProductos, listProductosParaProduccion } from "@/repositories/productosRepository";
import { listEmpleados } from "@/repositories/empleadosRepository";
import { listPerfiles } from "@/repositories/perfilesRepository";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompletarProduccionForm } from "@/features/produccion/components/CompletarProduccionForm";
import { CancelarProduccionDialog } from "@/features/produccion/components/CancelarProduccionDialog";

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Pendiente",
  completado: "Completado",
  cancelado: "Cancelado",
};

export default async function ProduccionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const produccion = await getProduccion(supabase, id);
  if (!produccion) notFound();

  const [items, productos, productosParaProduccion, empleados, perfiles] = await Promise.all([
    getProduccionItems(supabase, id),
    listProductos(supabase),
    listProductosParaProduccion(supabase),
    listEmpleados(supabase),
    listPerfiles(supabase),
  ]);

  const nombreProducto = (productoId: string) =>
    productos.find((p) => p.id === productoId)?.nombre ?? "—";
  const nombreEmpleado = (empleadoId: string) =>
    empleados.find((e) => e.id === empleadoId)?.nombre ?? "—";
  const nombrePerfil = (perfilId: string | null) =>
    perfiles.find((p) => p.id === perfilId)?.nombre_completo ??
    perfiles.find((p) => p.id === perfilId)?.email ??
    "—";

  const productosPlanificados = items
    .map((i) => productos.find((p) => p.id === i.producto_id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Producción</h1>
          <p className="text-sm text-muted-foreground">
            Empleado: {nombreEmpleado(produccion.empleado_id)} · Cargada por{" "}
            {nombrePerfil(produccion.usuario_id)} · Pedido:{" "}
            {new Date(`${produccion.fecha_pedido}T00:00:00`).toLocaleDateString("es-AR")} ·
            Entrega: {new Date(`${produccion.fecha_entrega}T00:00:00`).toLocaleDateString("es-AR")}{" "}
            · {ETIQUETA_ESTADO[produccion.estado] ?? produccion.estado}
          </p>
          {produccion.observaciones && (
            <p className="text-sm text-muted-foreground">
              Observaciones: {produccion.observaciones}
            </p>
          )}
          {produccion.fecha_completado && (
            <p className="text-sm text-muted-foreground">
              Completada por {nombrePerfil(produccion.usuario_completo_id)} el{" "}
              {new Date(produccion.fecha_completado).toLocaleString("es-AR")}
            </p>
          )}
        </div>
        {produccion.estado === "pendiente" && (
          <CancelarProduccionDialog produccionId={produccion.id} />
        )}
      </div>

      {produccion.estado === "pendiente" ? (
        <CompletarProduccionForm
          produccionId={produccion.id}
          itemsPlanificados={items}
          productosPlanificados={productosPlanificados}
          productosDisponibles={productosParaProduccion}
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Cantidad pedida</TableHead>
                <TableHead>Cantidad producida</TableHead>
                <TableHead>T° del medio de cocción</TableHead>
                <TableHead>T° interna del alimento</TableHead>
                <TableHead>Tiempo de cocción (min)</TableHead>
                <TableHead>Diferencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{nombreProducto(item.producto_id)}</TableCell>
                  <TableCell>{item.cantidad_pedida}</TableCell>
                  <TableCell>{item.cantidad_producida ?? "—"}</TableCell>
                  <TableCell>{item.temperatura_medio_coccion ?? "—"}</TableCell>
                  <TableCell>{item.temperatura_interna_alimento ?? "—"}</TableCell>
                  <TableCell>{item.tiempo_coccion_minutos ?? "—"}</TableCell>
                  <TableCell
                    className={
                      !item.diferencia ? "text-muted-foreground" : "font-medium text-destructive"
                    }
                  >
                    {item.diferencia == null
                      ? "—"
                      : item.diferencia > 0
                        ? `+${item.diferencia}`
                        : item.diferencia}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
