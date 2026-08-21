"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Printer } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { ListadoImprimible } from "@/components/print/ListadoImprimible";
import { Checkbox } from "@/components/ui/checkbox";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductoDialog } from "@/features/productos/components/ProductoDialog";
import { EliminarProductoDialog } from "@/features/productos/components/EliminarProductoDialog";
import { EliminarProductosDialog } from "@/features/productos/components/EliminarProductosDialog";
import { actualizarProducto } from "@/features/productos/actions";
import { useProductosTable } from "@/features/productos/hooks/useProductosTable";
import { listProductos } from "@/repositories/productosRepository";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import { throwIfActionError } from "@/lib/actionResult";
import { formatearMoneda } from "@/lib/format";
import type { Categoria } from "@/repositories/categoriasRepository";
import type { Producto } from "@/repositories/productosRepository";

function ActivoCell({ producto }: { producto: Producto }) {
  const [isPending, startTransition] = useTransition();
  const [activo, setActivo] = useState(producto.activo);

  function handleActivoChange(nuevoActivo: boolean) {
    setActivo(nuevoActivo);
    startTransition(async () => {
      try {
        throwIfActionError(await actualizarProducto(producto.id, { activo: nuevoActivo }));
      } catch {
        setActivo(!nuevoActivo);
      }
    });
  }

  return (
    <Checkbox
      checked={activo}
      onCheckedChange={(checked) => handleActivoChange(checked === true)}
      disabled={isPending}
    />
  );
}

export function ProductosTable({
  categorias,
}: {
  categorias: Categoria[];
}) {
  const table = useProductosTable();
  const nombreCategoria = (id: string) => categorias.find((c) => c.id === id)?.nombre ?? "—";
  const [exportando, setExportando] = useState(false);
  const [errorExport, setErrorExport] = useState<string | null>(null);
  const [listado, setListado] = useState<(string | number)[][] | null>(null);
  // Mapa id -> nombre en vez de un Set: la selección persiste entre páginas/filtros (no se
  // limpia solo porque la fila deja de estar visible), y el nombre queda a mano para mostrarlo
  // en el diálogo de confirmación y en el reporte de "no se pudo eliminar" sin depender de que
  // esa fila siga cargada en `table.data`.
  const [seleccionados, setSeleccionados] = useState<Map<string, string>>(new Map());

  function toggleSeleccionado(producto: Producto, checked: boolean) {
    setSeleccionados((prev) => {
      const next = new Map(prev);
      if (checked) next.set(producto.id, producto.nombre);
      else next.delete(producto.id);
      return next;
    });
  }

  const idsVisibles = table.data.map((p) => p.id);
  const todosVisiblesSeleccionados =
    idsVisibles.length > 0 && idsVisibles.every((id) => seleccionados.has(id));

  function toggleTodosVisibles(checked: boolean) {
    setSeleccionados((prev) => {
      const next = new Map(prev);
      for (const producto of table.data) {
        if (checked) next.set(producto.id, producto.nombre);
        else next.delete(producto.id);
      }
      return next;
    });
  }

  useEffect(() => {
    if (!listado) return;
    const limpiar = () => setListado(null);
    window.addEventListener("afterprint", limpiar);
    window.print();
    return () => window.removeEventListener("afterprint", limpiar);
  }, [listado]);

  async function exportarImprimible() {
    setErrorExport(null);
    setExportando(true);
    try {
      const supabase = createClient();
      const productos = await listProductos(supabase, {
        categoriaId: table.categoriaId === table.todasValue ? undefined : table.categoriaId,
        nombre: table.nombreInput || undefined,
        activo: table.activo === table.todosActivoValue ? undefined : table.activo === "true",
      });
      setListado(
        productos.map((p) => [
          p.nombre,
          nombreCategoria(p.categoria_id),
          p.tipo_venta === "peso" ? "Peso (kg)" : "Unidad",
          formatearMoneda(p.precio),
          p.controla_stock ? (p.stock_actual ?? "") : "sin control",
          p.activo ? "Sí" : "No",
        ]),
      );
    } catch (err) {
      setErrorExport(getErrorMessage(err, "No se pudo generar el listado."));
    } finally {
      setExportando(false);
    }
  }

  const columns = useMemo<ColumnDef<Producto, unknown>[]>(
    () => [
      {
        id: "seleccionar",
        header: () => (
          <Checkbox
            checked={todosVisiblesSeleccionados}
            onCheckedChange={(checked) => toggleTodosVisibles(checked === true)}
            aria-label="Seleccionar todos los productos de esta página"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={seleccionados.has(row.original.id)}
            onCheckedChange={(checked) => toggleSeleccionado(row.original, checked === true)}
            aria-label={`Seleccionar ${row.original.nombre}`}
          />
        ),
      },
      {
        accessorKey: "nombre",
        header: "Nombre",
      },
      {
        id: "categoria",
        header: "Categoría",
        cell: ({ row }) => nombreCategoria(row.original.categoria_id),
      },
      {
        accessorKey: "tipo_venta",
        header: "Venta",
        cell: ({ row }) => (row.original.tipo_venta === "peso" ? "Peso (kg)" : "Unidad"),
      },
      {
        accessorKey: "precio",
        header: "Precio",
        cell: ({ row }) => (
          <>
            {formatearMoneda(row.original.precio)}
            {row.original.tipo_venta === "peso" ? "/kg" : ""}
          </>
        ),
      },
      {
        accessorKey: "stock_actual",
        header: "Stock",
        cell: ({ row }) =>
          row.original.controla_stock ? row.original.stock_actual : "sin control",
      },
      {
        accessorKey: "activo",
        header: "Activo",
        cell: ({ row }) => <ActivoCell producto={row.original} />,
      },
      {
        id: "acciones",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <ProductoDialog categorias={categorias} producto={row.original} onSaved={table.refetch} />
            <EliminarProductoDialog producto={row.original} onEliminado={table.refetch} />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categorias, table.data, seleccionados, todosVisiblesSeleccionados],
  );

  return (
    <>
    <div className="flex flex-col gap-4 print:hidden">
      <div className="flex flex-wrap items-end justify-between gap-2">
        {/* Selects nativos a propósito, mismo criterio que features/gastos/components/GastosTable.tsx. */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-2">
            <Label htmlFor="categoria-filtro">Categoría</Label>
            <select
              id="categoria-filtro"
              value={table.categoriaId}
              onChange={(e) => table.setCategoriaId(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value={table.todasValue}>Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="activo-filtro">Estado</Label>
            <select
              id="activo-filtro"
              value={table.activo}
              onChange={(e) => table.setActivo(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value={table.todosActivoValue}>Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nombre-filtro">Buscar por nombre</Label>
            <Input
              id="nombre-filtro"
              type="search"
              placeholder="Nombre del producto..."
              value={table.nombreInput}
              onChange={(e) => table.setNombreInput(e.target.value)}
              className="w-56"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/productos/categorias" className={buttonVariants({ variant: "outline" })}>
            Categorías
          </Link>
          <Link href="/admin/productos/reposicion" className={buttonVariants({ variant: "outline" })}>
            Reposición
          </Link>
          <Button type="button" variant="outline" onClick={exportarImprimible} disabled={exportando}>
            <Printer className="size-4" />
            {exportando ? "Generando..." : "Exportar listado"}
          </Button>
          <ProductoDialog categorias={categorias} onSaved={table.refetch} />
        </div>
      </div>

      {errorExport && <p className="text-sm text-destructive">{errorExport}</p>}

      {seleccionados.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2">
          <p className="text-sm">{seleccionados.size} producto(s) seleccionado(s)</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setSeleccionados(new Map())}>
              Cancelar selección
            </Button>
            <EliminarProductosDialog
              seleccionados={seleccionados}
              onTerminado={() => {
                setSeleccionados(new Map());
                table.refetch();
              }}
            />
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={table.data}
        isLoading={table.isLoading}
        pageIndex={table.pageIndex}
        pageSize={table.pageSize}
        totalCount={table.count}
        onPageChange={table.setPageIndex}
        sorting={table.sorting}
        onSortingChange={table.setSorting}
        emptyMessage={
          table.categoriaId !== table.todasValue ||
          table.activo !== table.todosActivoValue ||
          table.nombreInput
            ? "No hay productos que coincidan con el filtro."
            : "No hay productos cargados."
        }
      />
    </div>
    {listado && (
      <ListadoImprimible
        titulo="Productos"
        headers={["Nombre", "Categoría", "Venta", "Precio", "Stock", "Activo"]}
        rows={listado}
      />
    )}
    </>
  );
}
