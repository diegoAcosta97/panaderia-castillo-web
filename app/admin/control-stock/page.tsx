import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  listControlesStock,
  listDetallesConDiferencia,
} from "@/repositories/controlStockRepository";
import { listProductos } from "@/repositories/productosRepository";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { ControlesStockTable } from "@/features/control-stock/components/ControlesStockTable";

const ETIQUETA_ESTADO: Record<string, string> = {
  en_progreso: "En progreso",
  pendiente_aprobacion: "Pendiente de aprobación",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

// E11-5: historial de controles + un desglose por producto de sus diferencias a lo largo de
// varios controles (RF-9.3) -- así se ven faltantes recurrentes sin tener que abrir control por
// control.
export default async function ControlStockHistorialPage() {
  const supabase = await createClient();
  const [controles, detallesConDiferencia, productos] = await Promise.all([
    listControlesStock(supabase),
    listDetallesConDiferencia(supabase),
    listProductos(supabase),
  ]);

  const controlPorId = new Map(controles.map((c) => [c.id, c]));
  const nombreProducto = (productoId: string) =>
    productos.find((p) => p.id === productoId)?.nombre ?? "—";

  const diferenciasPorProducto = [...detallesConDiferencia]
    .filter((d) => controlPorId.has(d.control_stock_id))
    .sort((a, b) => {
      const nombreCmp = nombreProducto(a.producto_id).localeCompare(nombreProducto(b.producto_id));
      if (nombreCmp !== 0) return nombreCmp;
      const fechaA = controlPorId.get(a.control_stock_id)!.fecha_inicio;
      const fechaB = controlPorId.get(b.control_stock_id)!.fecha_inicio;
      return fechaB.localeCompare(fechaA);
    });

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Control de stock</h1>
        <Link href="/admin/control-stock/nuevo" className={buttonVariants()}>
          Nuevo control
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Controles</h2>
        <ControlesStockTable />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Diferencias por producto</h2>
        <p className="text-muted-foreground text-sm">
          Todas las diferencias distintas de cero registradas en cualquier control, para detectar
          faltantes recurrentes de un mismo producto.
        </p>
        {diferenciasPorProducto.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Ningún control registró diferencias todavía.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Fecha del control</TableHead>
                <TableHead>Diferencia</TableHead>
                <TableHead>Estado del control</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {diferenciasPorProducto.map((d) => {
                const control = controlPorId.get(d.control_stock_id)!;
                return (
                  <TableRow key={d.id}>
                    <TableCell>{nombreProducto(d.producto_id)}</TableCell>
                    <TableCell>{new Date(control.fecha_inicio).toLocaleDateString("es-AR")}</TableCell>
                    <TableCell className="font-medium text-destructive">
                      {d.diferencia > 0 ? `+${d.diferencia}` : d.diferencia}
                    </TableCell>
                    <TableCell>{ETIQUETA_ESTADO[control.estado] ?? control.estado}</TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/control-stock/${control.id}`}
                        className="text-sm underline"
                      >
                        Ver control
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
