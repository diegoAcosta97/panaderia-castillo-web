"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/DataTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCajaTurnosTable } from "@/features/caja/hooks/useCajaTurnosTable";
import type { CajaTurno } from "@/repositories/cajaTurnosRepository";

export function CajaTurnosTable() {
  const table = useCajaTurnosTable();

  const columns = useMemo<ColumnDef<CajaTurno, unknown>[]>(
    () => [
      { accessorKey: "fecha", header: "Fecha" },
      {
        accessorKey: "etiqueta_turno",
        header: "Turno",
        cell: ({ row }) => row.original.etiqueta_turno || "—",
      },
      { accessorKey: "estado", header: "Estado" },
      {
        accessorKey: "monto_apertura",
        header: "Apertura",
        cell: ({ row }) => `$${row.original.monto_apertura}`,
      },
      {
        accessorKey: "monto_cierre_declarado",
        header: "Cierre declarado",
        cell: ({ row }) =>
          row.original.monto_cierre_declarado != null
            ? `$${row.original.monto_cierre_declarado}`
            : "—",
      },
      {
        accessorKey: "efectivo_esperado",
        header: "Esperado",
        cell: ({ row }) =>
          row.original.efectivo_esperado != null ? `$${row.original.efectivo_esperado}` : "—",
      },
      {
        accessorKey: "diferencia",
        header: "Diferencia",
        cell: ({ row }) => (
          <span
            className={
              row.original.diferencia != null && row.original.diferencia !== 0
                ? "font-medium text-destructive"
                : undefined
            }
          >
            {row.original.diferencia != null ? `$${row.original.diferencia}` : "—"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-2">
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
        emptyMessage="No hay turnos que coincidan con el filtro."
      />
    </div>
  );
}
