"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Filter } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGastosTable } from "@/features/gastos/hooks/useGastosTable";
import type { Gasto } from "@/repositories/gastosRepository";
import type { Proveedor } from "@/repositories/proveedoresRepository";

export function GastosTable({ proveedores }: { proveedores: Proveedor[] }) {
  const table = useGastosTable();
  const nombreProveedor = (id: string) => proveedores.find((p) => p.id === id)?.nombre ?? "—";

  const columns = useMemo<ColumnDef<Gasto, unknown>[]>(
    () => [
      {
        accessorKey: "fecha",
        header: "Fecha",
        cell: ({ row }) => new Date(row.original.fecha).toLocaleString("es-AR"),
      },
      {
        id: "proveedor",
        header: "Proveedor",
        cell: ({ row }) => nombreProveedor(row.original.proveedor_id),
      },
      { accessorKey: "concepto", header: "Concepto" },
      {
        accessorKey: "monto",
        header: "Monto",
        cell: ({ row }) => `$${row.original.monto}`,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [proveedores],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Select nativo a propósito, mismo criterio que en el resto del proyecto: no hay
          react-hook-form y este es un select simple sin necesidad del look de shadcn. */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-2">
          <Label htmlFor="proveedorId">Proveedor</Label>
          <select
            id="proveedorId"
            value={table.proveedorId}
            onChange={(e) => table.setProveedorId(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Todos</option>
            {proveedores.map((p) => (
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
        {(table.proveedorId || table.desde || table.hasta) && (
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
        emptyMessage="No hay gastos que coincidan con el filtro."
      />

      <p className="text-sm text-muted-foreground">
        Total: <span className="font-medium text-foreground">${table.total.toFixed(2)}</span> (
        {table.count} {table.count === 1 ? "gasto" : "gastos"})
      </p>
    </div>
  );
}
