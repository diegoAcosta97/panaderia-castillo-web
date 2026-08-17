"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Printer } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProduccionesTable } from "@/features/produccion/hooks/useProduccionesTable";
import type { Produccion } from "@/repositories/produccionRepository";
import type { Empleado } from "@/repositories/empleadosRepository";

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Pendiente",
  completado: "Completado",
  cancelado: "Cancelado",
};

export function ProduccionesTable({ empleados }: { empleados: Empleado[] }) {
  const table = useProduccionesTable();

  const columns = useMemo<ColumnDef<Produccion, unknown>[]>(
    () => [
      {
        accessorKey: "fecha_pedido",
        header: "Fecha de pedido",
        cell: ({ row }) => new Date(`${row.original.fecha_pedido}T00:00:00`).toLocaleDateString("es-AR"),
      },
      {
        accessorKey: "fecha_entrega",
        header: "Fecha de entrega",
        cell: ({ row }) => new Date(`${row.original.fecha_entrega}T00:00:00`).toLocaleDateString("es-AR"),
      },
      {
        id: "empleado",
        header: "Empleado",
        cell: ({ row }) => empleados.find((e) => e.id === row.original.empleado_id)?.nombre ?? "—",
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
          <div className="flex gap-1">
            <Link
              href={`/admin/produccion/${row.original.id}`}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
              aria-label="Ver"
            >
              <Eye className="size-4" />
            </Link>
            <Link
              href={`/admin/produccion/${row.original.id}/comprobante`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
              aria-label="Imprimir pedido de producción"
            >
              <Printer className="size-4" />
            </Link>
          </div>
        ),
      },
    ],
    [empleados],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-2">
          <Label htmlFor="produccion-estado">Estado</Label>
          <Select value={table.estado} onValueChange={(v) => v && table.setEstado(v)}>
            <SelectTrigger id="produccion-estado" className="w-40">
              <SelectValue>{(value: string) => ETIQUETA_ESTADO[value] ?? "Todos"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={table.todosValue}>Todos</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="completado">Completado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
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
        emptyMessage="No hay producciones que coincidan con el filtro."
      />
    </div>
  );
}
