"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { finalizarConteo } from "@/features/control-stock/actions";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import { throwIfActionError } from "@/lib/actionResult";
import { listProductosControlaStock } from "@/repositories/productosRepository";
import type { Categoria } from "@/repositories/categoriasRepository";
import type { Producto } from "@/repositories/productosRepository";

const PRODUCTOS_POR_PAGINA = 20;

// E11-2: el conteo se hace categoría por categoría -- elegir una acota la lista a algo manejable
// (RF-9.1). `listProductosControlaStock` ya viene sin filtro de `activo`: un conteo físico cuenta
// lo que hay en el estante sin distinguir activo/inactivo.
//
// El stock_actual leído al traer los productos de la categoría ES el snapshot stock_sistema
// (RF-9.2) -- se guarda en el estado por producto para que no cambie aunque el admin tarde en
// completar el conteo.
//
// A propósito, quien cuenta NO ve acá ni el stock sistema ni la diferencia: si los viera,
// terminaría ajustando el número contado para que "cierre" en vez de reportar lo que efectivamente
// hay en el estante, que es todo el sentido de un conteo físico independiente. Esos dos datos sí
// se calculan y se mandan igual al finalizar (para el informe completo que ve el admin en
// /admin/control-stock/[id] al aprobar/rechazar) -- que no se pueda ver la comparación EN VIVO
// mientras estás contando, en el input, así es como sirve.
export function NuevoControlStockForm({ categorias }: { categorias: Categoria[] }) {
  const [categoriaId, setCategoriaId] = useState("");
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [isLoadingProductos, setIsLoadingProductos] = useState(false);
  const [contados, setContados] = useState<Record<string, string>>({});
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pagina, setPagina] = useState(0);
  const router = useRouter();

  const fetchProductos = useCallback(async () => {
    if (!categoriaId) return;
    setIsLoadingProductos(true);
    try {
      const supabase = createClient();
      setProductos(await listProductosControlaStock(supabase, categoriaId));
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar los productos"));
    } finally {
      setIsLoadingProductos(false);
    }
  }, [categoriaId]);

  useEffect(() => {
    Promise.resolve().then(() => fetchProductos());
  }, [fetchProductos]);

  function handleCategoriaChange(value: string) {
    setCategoriaId(value);
    setProductos(null);
    setContados({});
    setPagina(0);
    setError(null);
  }

  const filas = useMemo(
    () =>
      (productos ?? []).map((p) => {
        const stockSistema = p.stock_actual ?? 0;
        const raw = contados[p.id] ?? "";
        const stockContado = raw === "" ? null : Number(raw);
        const diferencia = stockContado === null ? null : stockContado - stockSistema;
        return { producto: p, stockSistema, stockContado, diferencia };
      }),
    [productos, contados],
  );

  // La validación y el envío siguen operando sobre TODAS las filas -- solo la tabla que se
  // muestra está paginada, `contados` y `faltanValores` no dependen de qué página está activa.
  const faltanValores = filas.some((f) => f.stockContado === null || Number.isNaN(f.stockContado));
  const pageCount = Math.max(1, Math.ceil(filas.length / PRODUCTOS_POR_PAGINA));
  const filasPagina = filas.slice(
    pagina * PRODUCTOS_POR_PAGINA,
    pagina * PRODUCTOS_POR_PAGINA + PRODUCTOS_POR_PAGINA,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const detalles = filas.map((f) => ({
        productoId: f.producto.id,
        stockSistema: f.stockSistema,
        stockContado: f.stockContado as number,
      }));
      const control = throwIfActionError(await finalizarConteo(detalles, observaciones));
      router.push(`/admin/control-stock/${control.id}`);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo finalizar el conteo"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Select nativo a propósito, mismo criterio que features/gastos/components/GastosTable.tsx. */}
      <div className="grid max-w-xs gap-2">
        <Label htmlFor="categoria-control-stock">Categoría</Label>
        <select
          id="categoria-control-stock"
          value={categoriaId}
          onChange={(e) => handleCategoriaChange(e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="">Elegí una categoría...</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!categoriaId && (
        <p className="text-muted-foreground text-sm">
          Elegí una categoría para empezar el conteo.
        </p>
      )}

      {categoriaId && isLoadingProductos && (
        <p className="text-muted-foreground text-sm">Cargando productos...</p>
      )}

      {categoriaId && !isLoadingProductos && productos && productos.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Ningún producto de esta categoría tiene activado &quot;controla stock&quot;, no hay
          nada para contar.
        </p>
      )}

      {categoriaId && !isLoadingProductos && productos && productos.length > 0 && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Stock contado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filasPagina.map(({ producto }) => (
                <TableRow key={producto.id}>
                  <TableCell>{producto.nombre}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      required
                      className="w-28"
                      value={contados[producto.id] ?? ""}
                      onChange={(e) =>
                        setContados((prev) => ({ ...prev, [producto.id]: e.target.value }))
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Página {pagina + 1} de {pageCount} ({filas.length} productos)
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPagina((p) => p - 1)}
                disabled={pagina <= 0}
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPagina((p) => p + 1)}
                disabled={pagina >= pageCount - 1}
              >
                Siguiente
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid max-w-sm gap-2">
            <Label htmlFor="observaciones-control">Observaciones (opcional)</Label>
            <Input
              id="observaciones-control"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          <div>
            <Button type="submit" disabled={isLoading || faltanValores}>
              <ClipboardCheck className="size-4" />
              {isLoading ? "Finalizando..." : "Finalizar conteo"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
