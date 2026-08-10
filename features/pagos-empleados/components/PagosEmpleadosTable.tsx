"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Filter } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePagosEmpleadosTable } from "@/features/pagos-empleados/hooks/usePagosEmpleadosTable";
import type { PagoEmpleado } from "@/repositories/pagosEmpleadosRepository";
import type { Empleado } from "@/repositories/empleadosRepository";

export function PagosEmpleadosTable({ empleados }: { empleados: Empleado[] }) {
  const table = usePagosEmpleadosTable();
  const nombreEmpleado = (id: string) => empleados.find((e) => e.id === id)?.nombre ?? "—";

  const columns = useMemo<ColumnDef<PagoEmpleado, unknown>[]>(
    () => [
      {
        accessorKey: "fecha",
        header: "Fecha",
        cell: ({ row }) => new Date(row.original.fecha).toLocaleString("es-AR"),
      },
      {
        id: "empleado",
        header: "Empleado",
        cell: ({ row }) => nombreEmpleado(row.original.empleado_id),
      },
      {
        id: "periodo",
        header: "Período",
        cell: ({ row }) =>
          row.original.periodo_desde === row.original.periodo_hasta
            ? row.original.periodo_desde
            : `${row.original.periodo_desde} – ${row.original.periodo_hasta}`,
      },
      {
        accessorKey: "monto",
        header: "Monto",
        cell: ({ row }) => `$${row.original.monto}`,
      },
      {
        accessorKey: "observaciones",
        header: "Observaciones",
        cell: ({ row }) => row.original.observaciones || "—",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [empleados],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Select nativo a propósito, mismo criterio que features/gastos/components/GastosTable.tsx. */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-2">
          <Label htmlFor="empleadoId">Empleado</Label>
          <select
            id="empleadoId"
            value={table.empleadoId}
            onChange={(e) => table.setEmpleadoId(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Todos</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
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
        {(table.empleadoId || table.desde || table.hasta) && (
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
        emptyMessage="No hay pagos que coincidan con el filtro."
      />

      <p className="text-sm text-muted-foreground">
        Total: <span className="font-medium text-foreground">${table.total.toFixed(2)}</span> (
        {table.count} {table.count === 1 ? "pago" : "pagos"})
      </p>
    </div>
  );
}
