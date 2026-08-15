"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Filter, Download } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMovimientosStockTable } from "@/features/movimientos-stock/hooks/useMovimientosStockTable";
import { TIPO_MOVIMIENTO_LABELS, TIPOS_MOVIMIENTO_ORDENADOS } from "@/features/movimientos-stock/lib/tipoMovimientoLabels";
import { listMovimientosStock } from "@/repositories/movimientosStockRepository";
import { createClient } from "@/lib/supabase/client";
import { descargarCsv } from "@/lib/csv";
import { getErrorMessage } from "@/lib/errors";
import type { MovimientoStock } from "@/repositories/movimientosStockRepository";
import type { Producto } from "@/repositories/productosRepository";
import type { Empleado } from "@/repositories/empleadosRepository";
import type { Perfil } from "@/repositories/perfilesRepository";
import type { TipoMovimientoStock } from "@/types/database";

export function MovimientosStockTable({
  productos,
  empleados,
  perfiles,
}: {
  productos: Producto[];
  empleados: Empleado[];
  perfiles: Perfil[];
}) {
  const table = useMovimientosStockTable();
  const nombreProducto = (id: string) => productos.find((p) => p.id === id)?.nombre ?? "—";
  const nombreEmpleado = (id: string | null) =>
    id ? (empleados.find((e) => e.id === id)?.nombre ?? "—") : "—";
  const nombreUsuario = (id: string) => {
    const perfil = perfiles.find((p) => p.id === id);
    return perfil?.nombre_completo || perfil?.email || "—";
  };
  const [exportando, setExportando] = useState(false);
  const [errorExport, setErrorExport] = useState<string | null>(null);

  async function exportarCsv() {
    setErrorExport(null);
    setExportando(true);
    try {
      const supabase = createClient();
      const movimientos = await listMovimientosStock(supabase, {
        tipo: table.tipo === table.todosValue ? undefined : (table.tipo as TipoMovimientoStock),
        productoId: table.productoId || undefined,
        desde: table.desde || undefined,
        hasta: table.hasta || undefined,
      });
      descargarCsv(
        `movimientos_stock_${new Date().toISOString().slice(0, 10)}.csv`,
        ["Fecha", "Tipo", "Producto", "Cantidad", "Stock resultante", "Motivo", "Empleado", "Registrado por"],
        movimientos.map((m) => [
          new Date(m.fecha).toLocaleString("es-AR"),
          TIPO_MOVIMIENTO_LABELS[m.tipo],
          nombreProducto(m.producto_id),
          m.cantidad,
          m.stock_resultante,
          m.motivo || "",
          nombreEmpleado(m.empleado_id),
          nombreUsuario(m.usuario_id),
        ]),
      );
    } catch (err) {
      setErrorExport(getErrorMessage(err, "No se pudo exportar el CSV."));
    } finally {
      setExportando(false);
    }
  }

  const columns = useMemo<ColumnDef<MovimientoStock, unknown>[]>(
    () => [
      {
        accessorKey: "fecha",
        header: "Fecha",
        cell: ({ row }) => new Date(row.original.fecha).toLocaleString("es-AR"),
      },
      {
        id: "tipo",
        header: "Tipo",
        cell: ({ row }) => TIPO_MOVIMIENTO_LABELS[row.original.tipo],
      },
      {
        id: "producto",
        header: "Producto",
        cell: ({ row }) => nombreProducto(row.original.producto_id),
      },
      {
        accessorKey: "cantidad",
        header: "Cantidad",
        cell: ({ row }) => row.original.cantidad,
      },
      {
        accessorKey: "stock_resultante",
        header: "Stock resultante",
        cell: ({ row }) => row.original.stock_resultante,
      },
      {
        accessorKey: "motivo",
        header: "Motivo",
        cell: ({ row }) => row.original.motivo || "—",
      },
      {
        id: "empleado",
        header: "Empleado",
        cell: ({ row }) => nombreEmpleado(row.original.empleado_id),
      },
      {
        id: "usuario",
        header: "Registrado por",
        cell: ({ row }) => nombreUsuario(row.original.usuario_id),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productos, empleados, perfiles],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Selects nativos a propósito, mismo criterio que features/gastos/components/GastosTable.tsx. */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-2">
          <Label htmlFor="tipo">Tipo</Label>
          <select
            id="tipo"
            value={table.tipo}
            onChange={(e) => table.setTipo(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value={table.todosValue}>Todos</option>
            {TIPOS_MOVIMIENTO_ORDENADOS.map((t) => (
              <option key={t} value={t}>
                {TIPO_MOVIMIENTO_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="producto">Producto</Label>
          <select
            id="producto"
            value={table.productoId}
            onChange={(e) => table.setProductoId(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Todos</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="desde">Desde</Label>
          <Input
            id="desde"
            type="date"
            value={table.desde}
            onChange={(e) => table.setDesde(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="hasta">Hasta</Label>
          <Input
            id="hasta"
            type="date"
            value={table.hasta}
            onChange={(e) => table.setHasta(e.target.value)}
          />
        </div>
        {(table.tipo !== table.todosValue || table.productoId || table.desde || table.hasta) && (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Filter className="size-3.5" />
            Filtros activos
          </p>
        )}
        <Button type="button" variant="outline" onClick={exportarCsv} disabled={exportando}>
          <Download className="size-4" />
          {exportando ? "Exportando..." : "Exportar CSV"}
        </Button>
      </div>

      {errorExport && <p className="text-sm text-destructive">{errorExport}</p>}

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
        emptyMessage="No hay movimientos que coincidan con el filtro."
      />
    </div>
  );
}
