"use client";

import { useMemo, useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/DataTable";
import { Checkbox } from "@/components/ui/checkbox";
import { EmpleadoDialog } from "@/features/empleados/components/EmpleadoDialog";
import { actualizarEmpleado } from "@/features/empleados/actions";
import { useEmpleadosTable } from "@/features/empleados/hooks/useEmpleadosTable";
import type { Empleado } from "@/repositories/empleadosRepository";

const LABEL_TIPO_COBRO: Record<Empleado["tipo_cobro"], string> = {
  por_dia: "Día",
  quincena: "Quincena",
};

function ActivoCell({ empleado }: { empleado: Empleado }) {
  const [isPending, startTransition] = useTransition();
  const [activo, setActivo] = useState(empleado.activo);

  function handleActivoChange(nuevoActivo: boolean) {
    setActivo(nuevoActivo);
    startTransition(() => actualizarEmpleado(empleado.id, { activo: nuevoActivo }));
  }

  return (
    <Checkbox
      checked={activo}
      onCheckedChange={(checked) => handleActivoChange(checked === true)}
      disabled={isPending}
    />
  );
}

export function EmpleadosTable() {
  const table = useEmpleadosTable();

  const columns = useMemo<ColumnDef<Empleado, unknown>[]>(
    () => [
      { accessorKey: "nombre", header: "Nombre" },
      {
        accessorKey: "tipo_cobro",
        header: "Cobra por",
        cell: ({ row }) => LABEL_TIPO_COBRO[row.original.tipo_cobro],
      },
      {
        accessorKey: "activo",
        header: "Activo",
        cell: ({ row }) => <ActivoCell empleado={row.original} />,
      },
      {
        id: "acciones",
        header: "",
        cell: ({ row }) => <EmpleadoDialog empleado={row.original} onSaved={table.refetch} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <EmpleadoDialog onSaved={table.refetch} />
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
        emptyMessage="No hay empleados cargados."
      />
    </div>
  );
}
