import { createClient } from "@/lib/supabase/server";
import { getConfiguracionNegocio } from "@/repositories/configuracionRepository";
import {
  listBloqueoCajaProductos,
  listBloqueoCajaConteos,
  listBloqueoCajaConteoItemsConDiferencia,
} from "@/repositories/bloqueoCajaRepository";
import { getProductosByIds, listProductos } from "@/repositories/productosRepository";
import type { BloqueoCajaProducto } from "@/repositories/bloqueoCajaRepository";
import type { Producto } from "@/repositories/productosRepository";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BloqueoCajaConfig } from "@/features/bloqueo-caja/components/BloqueoCajaConfig";

export default async function BloqueoCajaPage() {
  const supabase = await createClient();
  const [configuracion, filas, conteos, diferencias, productosTodos] = await Promise.all([
    getConfiguracionNegocio(supabase),
    listBloqueoCajaProductos(supabase),
    listBloqueoCajaConteos(supabase),
    listBloqueoCajaConteoItemsConDiferencia(supabase),
    listProductos(supabase),
  ]);

  const productosElegidos = await getProductosByIds(
    supabase,
    filas.map((f) => f.producto_id),
  );
  const productos = filas
    .map((fila) => ({
      fila,
      producto: productosElegidos.find((p) => p.id === fila.producto_id),
    }))
    .filter((p): p is { fila: BloqueoCajaProducto; producto: Producto } => Boolean(p.producto));

  const nombreProducto = (productoId: string) =>
    productosTodos.find((p) => p.id === productoId)?.nombre ?? "—";
  const conteoPorId = new Map(conteos.map((c) => [c.id, c]));
  const diferenciasOrdenadas = [...diferencias]
    .filter((d) => conteoPorId.has(d.bloqueo_caja_conteo_id))
    .sort((a, b) => {
      const fechaA = conteoPorId.get(a.bloqueo_caja_conteo_id)!.fecha;
      const fechaB = conteoPorId.get(b.bloqueo_caja_conteo_id)!.fecha;
      return fechaB.localeCompare(fechaA);
    });

  return (
    <div className="flex flex-col gap-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Bloqueo de caja</h1>
        <p className="text-muted-foreground text-sm">
          Control sorpresivo de stock antes de cerrar turno.
        </p>
      </div>

      <BloqueoCajaConfig
        configuracionId={configuracion.id}
        activoInicial={configuracion.bloqueo_caja_activo}
        productos={productos}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Diferencias detectadas</h2>
        <p className="text-muted-foreground text-sm">
          Diferencias distintas de cero entre el stock del sistema y lo contado en cualquier
          conteo sorpresivo registrado.
        </p>
        {diferenciasOrdenadas.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Ningún conteo sorpresivo registró diferencias todavía.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Fecha del conteo</TableHead>
                <TableHead>Stock sistema</TableHead>
                <TableHead>Stock contado</TableHead>
                <TableHead>Diferencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {diferenciasOrdenadas.map((d) => {
                const conteo = conteoPorId.get(d.bloqueo_caja_conteo_id)!;
                return (
                  <TableRow key={d.id}>
                    <TableCell>{nombreProducto(d.producto_id)}</TableCell>
                    <TableCell>{new Date(conteo.fecha).toLocaleString("es-AR")}</TableCell>
                    <TableCell>{d.stock_sistema}</TableCell>
                    <TableCell>{d.stock_contado}</TableCell>
                    <TableCell className="font-medium text-destructive">
                      {d.diferencia > 0 ? `+${d.diferencia}` : d.diferencia}
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
