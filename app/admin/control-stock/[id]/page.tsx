import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getControlStock,
  getDetallesControlStock,
} from "@/repositories/controlStockRepository";
import { listProductos } from "@/repositories/productosRepository";
import { listPerfiles } from "@/repositories/perfilesRepository";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AprobarRechazarControlStock } from "@/features/control-stock/components/AprobarRechazarControlStock";

const ETIQUETA_ESTADO: Record<string, string> = {
  en_progreso: "En progreso",
  pendiente_aprobacion: "Pendiente de aprobación",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export default async function ControlStockDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const control = await getControlStock(supabase, id);
  if (!control) notFound();

  const [detalles, productos, perfiles] = await Promise.all([
    getDetallesControlStock(supabase, id),
    listProductos(supabase),
    listPerfiles(supabase),
  ]);

  const nombreProducto = (productoId: string) =>
    productos.find((p) => p.id === productoId)?.nombre ?? "—";
  const nombrePerfil = (perfilId: string | null) =>
    perfiles.find((p) => p.id === perfilId)?.nombre_completo ??
    perfiles.find((p) => p.id === perfilId)?.email ??
    "—";

  const detallesOrdenados = [...detalles].sort(
    (a, b) => nombreProducto(a.producto_id).localeCompare(nombreProducto(b.producto_id)),
  );
  const conDiferencia = detalles.filter((d) => d.diferencia !== 0).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Control de stock</h1>
          <p className="text-muted-foreground text-sm">
            Iniciado por {nombrePerfil(control.usuario_id)} el{" "}
            {new Date(control.fecha_inicio).toLocaleString("es-AR")} ·{" "}
            {ETIQUETA_ESTADO[control.estado] ?? control.estado}
          </p>
          {control.observaciones && (
            <p className="text-muted-foreground text-sm">Observaciones: {control.observaciones}</p>
          )}
          {control.fecha_aprobacion && (
            <p className="text-muted-foreground text-sm">
              {control.estado === "aprobado" ? "Aprobado" : "Rechazado"} por{" "}
              {nombrePerfil(control.usuario_aprobador_id)} el{" "}
              {new Date(control.fecha_aprobacion).toLocaleString("es-AR")}
            </p>
          )}
        </div>
        {control.estado === "pendiente_aprobacion" && (
          <AprobarRechazarControlStock controlStockId={control.id} />
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {conDiferencia} de {detalles.length} producto(s) con diferencia.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Stock sistema</TableHead>
            <TableHead>Stock contado</TableHead>
            <TableHead>Diferencia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {detallesOrdenados.map((d) => (
            <TableRow key={d.id}>
              <TableCell>{nombreProducto(d.producto_id)}</TableCell>
              <TableCell>{d.stock_sistema}</TableCell>
              <TableCell>{d.stock_contado}</TableCell>
              <TableCell
                className={
                  d.diferencia === 0 ? "text-muted-foreground" : "font-medium text-destructive"
                }
              >
                {d.diferencia > 0 ? `+${d.diferencia}` : d.diferencia}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
