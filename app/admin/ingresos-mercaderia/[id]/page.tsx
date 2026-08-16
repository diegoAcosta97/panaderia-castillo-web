import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getIngresoMercaderia,
  getItemsIngresoMercaderia,
} from "@/repositories/ingresoMercaderiaRepository";
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
import { AprobarRechazarIngresoMercaderia } from "@/features/ingreso-mercaderia/components/AprobarRechazarIngresoMercaderia";

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente_aprobacion: "Pendiente de aprobación",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export default async function IngresoMercaderiaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const ingreso = await getIngresoMercaderia(supabase, id);
  if (!ingreso) notFound();

  const [items, productos, perfiles] = await Promise.all([
    getItemsIngresoMercaderia(supabase, id),
    listProductos(supabase),
    listPerfiles(supabase),
  ]);

  const nombreProducto = (productoId: string) =>
    productos.find((p) => p.id === productoId)?.nombre ?? "—";
  const nombrePerfil = (perfilId: string | null) =>
    perfiles.find((p) => p.id === perfilId)?.nombre_completo ??
    perfiles.find((p) => p.id === perfilId)?.email ??
    "—";

  const itemsOrdenados = [...items].sort((a, b) =>
    nombreProducto(a.producto_id).localeCompare(nombreProducto(b.producto_id)),
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Ingreso de mercadería</h1>
          <p className="text-muted-foreground text-sm">
            Cargado por {nombrePerfil(ingreso.usuario_id)} el{" "}
            {new Date(ingreso.fecha).toLocaleString("es-AR")} ·{" "}
            {ETIQUETA_ESTADO[ingreso.estado] ?? ingreso.estado}
          </p>
          {ingreso.observaciones && (
            <p className="text-muted-foreground text-sm">Observaciones: {ingreso.observaciones}</p>
          )}
          {ingreso.fecha_aprobacion && (
            <p className="text-muted-foreground text-sm">
              {ingreso.estado === "aprobado" ? "Aprobado" : "Rechazado"} por{" "}
              {nombrePerfil(ingreso.usuario_aprobador_id)} el{" "}
              {new Date(ingreso.fecha_aprobacion).toLocaleString("es-AR")}
            </p>
          )}
        </div>
        {ingreso.estado === "pendiente_aprobacion" && (
          <AprobarRechazarIngresoMercaderia ingresoMercaderiaId={ingreso.id} />
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead>Stock previo</TableHead>
            <TableHead>Stock resultante</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {itemsOrdenados.map((i) => (
            <TableRow key={i.id}>
              <TableCell>{nombreProducto(i.producto_id)}</TableCell>
              <TableCell>+{i.cantidad}</TableCell>
              <TableCell>{i.stock_previo}</TableCell>
              <TableCell>{i.stock_resultante ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
