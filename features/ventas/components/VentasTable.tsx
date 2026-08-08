"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/DataTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVentasTable } from "@/features/ventas/hooks/useVentasTable";
import type { Venta } from "@/repositories/ventasRepository";
import type { CajaTurno } from "@/repositories/cajaTurnosRepository";

const ETIQUETA_ESTADO: Record<string, string> = {
  completada: "Completada",
  pendiente_pago: "Pendiente de pago",
  anulada: "Anulada",
};

export function VentasTable({ turnos }: { turnos: CajaTurno[] }) {
  const table = useVentasTable();

  const columns = useMemo<ColumnDef<Venta, unknown>[]>(
    () => [
      { accessorKey: "numero_comprobante", header: "N.º" },
      {
        accessorKey: "fecha",
        header: "Fecha",
        cell: ({ row }) => new Date(row.original.fecha).toLocaleString("es-AR"),
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => `$${row.original.total}`,
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
          <div className="flex gap-3">
            <Link href={`/admin/ventas/${row.original.id}`} className="text-sm underline">
              Ver
            </Link>
            <Link
              href={`/pos/comprobante/${row.original.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline"
            >
              Comprobante
            </Link>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Select nativo a propósito, mismo criterio que en el resto del proyecto. */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-2">
          <Label htmlFor="cajaTurnoId">Turno de caja</Label>
          <select
            id="cajaTurnoId"
            value={table.cajaTurnoId}
            onChange={(e) => table.setCajaTurnoId(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Todos</option>
            {turnos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fecha} {t.etiqueta_turno ? `— ${t.etiqueta_turno}` : ""}
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
        emptyMessage="No hay ventas que coincidan con el filtro."
      />
    </div>
  );
}
