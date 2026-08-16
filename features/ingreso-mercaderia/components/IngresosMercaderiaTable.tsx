"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/DataTable";
import { useIngresosMercaderiaTable } from "@/features/ingreso-mercaderia/hooks/useIngresosMercaderiaTable";
import type { IngresoMercaderia } from "@/repositories/ingresoMercaderiaRepository";

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente_aprobacion: "Pendiente de aprobación",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export function IngresosMercaderiaTable() {
  const table = useIngresosMercaderiaTable();

  const columns = useMemo<ColumnDef<IngresoMercaderia, unknown>[]>(
    () => [
      {
        accessorKey: "fecha",
        header: "Fecha",
        cell: ({ row }) => new Date(row.original.fecha).toLocaleString("es-AR"),
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
          <Link href={`/admin/ingresos-mercaderia/${row.original.id}`} className="text-sm underline">
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
      emptyMessage="Todavía no se registró ningún ingreso de mercadería."
    />
  );
}
