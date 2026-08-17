"use client";

import { useMemo, useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/DataTable";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { NuevaCategoriaDialog } from "@/features/productos/components/NuevaCategoriaDialog";
import { actualizarCategoria } from "@/features/productos/actions";
import { useCategoriasTable } from "@/features/productos/hooks/useCategoriasTable";
import { throwIfActionError } from "@/lib/actionResult";
import type { Categoria } from "@/repositories/categoriasRepository";

function NombreCell({ categoria }: { categoria: Categoria }) {
  const [isPending, startTransition] = useTransition();
  const [nombre, setNombre] = useState(categoria.nombre);

  function handleBlur() {
    if (nombre.trim() && nombre !== categoria.nombre) {
      const nombreAnterior = categoria.nombre;
      startTransition(async () => {
        try {
          throwIfActionError(await actualizarCategoria(categoria.id, { nombre: nombre.trim() }));
        } catch {
          setNombre(nombreAnterior);
        }
      });
    }
  }

  return (
    <Input
      value={nombre}
      onChange={(e) => setNombre(e.target.value)}
      onBlur={handleBlur}
      disabled={isPending}
      className="h-8 max-w-64"
    />
  );
}

function ActivaCell({ categoria }: { categoria: Categoria }) {
  const [isPending, startTransition] = useTransition();
  const [activo, setActivo] = useState(categoria.activo);

  function handleActivoChange(nuevoActivo: boolean) {
    setActivo(nuevoActivo);
    startTransition(async () => {
      try {
        throwIfActionError(await actualizarCategoria(categoria.id, { activo: nuevoActivo }));
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

// E16-1: qué categorías se pueden listar al armar una producción (docs/backlog/16-produccion.md)
// -- checkbox editable en vez de filtrar por nombre, mismo criterio que "Activa" acá al lado.
function HabilitadaProduccionCell({ categoria }: { categoria: Categoria }) {
  const [isPending, startTransition] = useTransition();
  const [habilitada, setHabilitada] = useState(categoria.habilitada_produccion);

  function handleChange(nuevoValor: boolean) {
    setHabilitada(nuevoValor);
    startTransition(async () => {
      try {
        throwIfActionError(
          await actualizarCategoria(categoria.id, { habilitada_produccion: nuevoValor }),
        );
      } catch {
        setHabilitada(!nuevoValor);
      }
    });
  }

  return (
    <Checkbox
      checked={habilitada}
      onCheckedChange={(checked) => handleChange(checked === true)}
      disabled={isPending}
    />
  );
}

export function CategoriasTable() {
  const table = useCategoriasTable();

  const columns = useMemo<ColumnDef<Categoria, unknown>[]>(
    () => [
      {
        accessorKey: "nombre",
        header: "Nombre",
        cell: ({ row }) => <NombreCell categoria={row.original} />,
      },
      {
        accessorKey: "activo",
        header: "Activa",
        cell: ({ row }) => <ActivaCell categoria={row.original} />,
      },
      {
        accessorKey: "habilitada_produccion",
        header: "Habilitada para producción",
        cell: ({ row }) => <HabilitadaProduccionCell categoria={row.original} />,
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <NuevaCategoriaDialog onSaved={table.refetch} />
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
        emptyMessage="No hay categorías cargadas."
      />
    </div>
  );
}
