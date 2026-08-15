"use client";

import { useMemo, useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/DataTable";
import { Checkbox } from "@/components/ui/checkbox";
import { ProveedorDialog } from "@/features/proveedores/components/ProveedorDialog";
import { actualizarProveedor } from "@/features/proveedores/actions";
import { useProveedoresTable } from "@/features/proveedores/hooks/useProveedoresTable";
import { throwIfActionError } from "@/lib/actionResult";
import type { Proveedor } from "@/repositories/proveedoresRepository";

function ActivoCell({ proveedor }: { proveedor: Proveedor }) {
  const [isPending, startTransition] = useTransition();
  const [activo, setActivo] = useState(proveedor.activo);

  function handleActivoChange(nuevoActivo: boolean) {
    setActivo(nuevoActivo);
    startTransition(async () => {
      try {
        throwIfActionError(await actualizarProveedor(proveedor.id, { activo: nuevoActivo }));
      } catch {
        setActivo(!nuevoActivo);
      }
    });
  }

  return (
    <Checkbox
      checked={activo}
      onCheckedChange={(checked) => handleActivoChange(checked === true)}
      disabled={isPending}
    />
  );
}

export function ProveedoresTable() {
  const table = useProveedoresTable();

  const columns = useMemo<ColumnDef<Proveedor, unknown>[]>(
    () => [
      { accessorKey: "nombre", header: "Nombre" },
      {
        accessorKey: "cuit",
        header: "CUIT",
        cell: ({ row }) => row.original.cuit || "—",
      },
      {
        accessorKey: "telefono",
        header: "Teléfono",
        cell: ({ row }) => row.original.telefono || "—",
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => row.original.email || "—",
      },
      {
        accessorKey: "activo",
        header: "Activo",
        cell: ({ row }) => <ActivoCell proveedor={row.original} />,
      },
      {
        id: "acciones",
        header: "",
        cell: ({ row }) => <ProveedorDialog proveedor={row.original} onSaved={table.refetch} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ProveedorDialog onSaved={table.refetch} />
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
        emptyMessage="No hay proveedores cargados."
      />
    </div>
  );
}
