import { createClient } from "@/lib/supabase/server";
import { getConfiguracionNegocio } from "@/repositories/configuracionRepository";
import { listBloqueoCajaProductos } from "@/repositories/bloqueoCajaRepository";
import { getProductosByIds, listProductos } from "@/repositories/productosRepository";
import { listCategorias } from "@/repositories/categoriasRepository";
import { BloqueoCajaConfig } from "@/features/bloqueo-caja/components/BloqueoCajaConfig";
import { DiferenciasBloqueoCajaTable } from "@/features/bloqueo-caja/components/DiferenciasBloqueoCajaTable";
import type { BloqueoCajaProducto } from "@/repositories/bloqueoCajaRepository";
import type { Producto } from "@/repositories/productosRepository";

export default async function BloqueoCajaPage() {
  const supabase = await createClient();
  const [configuracion, filas, productosTodos, categorias] = await Promise.all([
    getConfiguracionNegocio(supabase),
    listBloqueoCajaProductos(supabase),
    listProductos(supabase),
    listCategorias(supabase),
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
        <DiferenciasBloqueoCajaTable categorias={categorias} productos={productosTodos} />
      </section>
    </div>
  );
}
