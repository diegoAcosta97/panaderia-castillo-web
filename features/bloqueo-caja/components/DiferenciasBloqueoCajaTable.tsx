"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Filter } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDiferenciasBloqueoCajaTable } from "@/features/bloqueo-caja/hooks/useDiferenciasBloqueoCajaTable";
import type { BloqueoCajaDiferencia } from "@/repositories/bloqueoCajaRepository";
import type { Categoria } from "@/repositories/categoriasRepository";
import type { Producto } from "@/repositories/productosRepository";

// E4-5: paginado y filtrable server-side -- con un conteo por cierre de turno, el listado sin
// límite (versión anterior) crecía sin techo. Mismo criterio de filtros (selects nativos) que
// features/movimientos-stock/components/MovimientosStockTable.tsx.
export function DiferenciasBloqueoCajaTable({
  categorias,
  productos,
}: {
  categorias: Categoria[];
  productos: Producto[];
}) {
  const table = useDiferenciasBloqueoCajaTable();

  const columns = useMemo<ColumnDef<BloqueoCajaDiferencia, unknown>[]>(
    () => [
      {
        accessorKey: "fecha",
        header: "Fecha del conteo",
        cell: ({ row }) => new Date(row.original.fecha).toLocaleString("es-AR"),
      },
      {
        accessorKey: "producto_nombre",
        header: "Producto",
      },
      {
        accessorKey: "categoria_nombre",
        header: "Categoría",
      },
      {
        accessorKey: "stock_sistema",
        header: "Stock sistema",
      },
      {
        accessorKey: "stock_contado",
        header: "Stock contado",
      },
      {
        accessorKey: "diferencia",
        header: "Diferencia",
        cell: ({ row }) => (
          <span className="font-medium text-destructive">
            {row.original.diferencia > 0 ? `+${row.original.diferencia}` : row.original.diferencia}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-2">
          <Label htmlFor="diferencias-categoria">Categoría</Label>
          <select
            id="diferencias-categoria"
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
          <Label htmlFor="diferencias-producto">Producto</Label>
          <select
            id="diferencias-producto"
            value={table.productoId}
            onChange={(e) => table.setProductoId(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value={table.todasValue}>Todos</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="diferencias-desde">Desde</Label>
          <Input
            id="diferencias-desde"
            type="date"
            value={table.desde}
            onChange={(e) => table.setDesde(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="diferencias-hasta">Hasta</Label>
          <Input
            id="diferencias-hasta"
            type="date"
            value={table.hasta}
            onChange={(e) => table.setHasta(e.target.value)}
          />
        </div>
        {(table.categoriaId !== table.todasValue ||
          table.productoId !== table.todasValue ||
          table.desde ||
          table.hasta) && (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Filter className="size-3.5" />
            Filtros activos
          </p>
        )}
      </div>

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
        emptyMessage="Ningún conteo sorpresivo registró diferencias con este filtro."
      />
    </div>
  );
}
