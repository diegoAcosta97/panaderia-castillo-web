"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/DataTable";
import { useControlesStockTable } from "@/features/control-stock/hooks/useControlesStockTable";
import type { ControlStock } from "@/repositories/controlStockRepository";

const ETIQUETA_ESTADO: Record<string, string> = {
  en_progreso: "En progreso",
  pendiente_aprobacion: "Pendiente de aprobación",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export function ControlesStockTable() {
  const table = useControlesStockTable();

  const columns = useMemo<ColumnDef<ControlStock, unknown>[]>(
    () => [
      {
        accessorKey: "fecha_inicio",
        header: "Fecha inicio",
        cell: ({ row }) => new Date(row.original.fecha_inicio).toLocaleString("es-AR"),
      },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ row }) => ETIQUETA_ESTADO[row.original.estado] ?? row.original.estado,
      },
      {
        id: "acciones",
        header: "",
        cell: ({ row }) => (
          <Link href={`/admin/control-stock/${row.original.id}`} className="text-sm underline">
            Ver
          </Link>
        ),
      },
    ],
    [],
  );

  return (
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
      emptyMessage="Todavía no se registró ningún control."
    />
  );
}
