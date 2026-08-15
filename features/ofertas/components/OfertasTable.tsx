"use client";

import { useMemo, useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/DataTable";
import { Checkbox } from "@/components/ui/checkbox";
import { OfertaDialog } from "@/features/ofertas/components/OfertaDialog";
import { actualizarOfertaActivo } from "@/features/ofertas/actions";
import { useOfertasTable } from "@/features/ofertas/hooks/useOfertasTable";
import { throwIfActionError } from "@/lib/actionResult";
import type { Producto } from "@/repositories/productosRepository";
import type { OfertaConItems } from "@/repositories/ofertasRepository";

const ETIQUETA_BENEFICIO = {
  precio_fijo: "Precio fijo",
  descuento_porcentaje: "% descuento",
  descuento_monto: "Monto fijo",
};

function ActivaCell({ oferta }: { oferta: OfertaConItems }) {
  const [isPending, startTransition] = useTransition();
  const [activo, setActivo] = useState(oferta.activo);

  function handleActivoChange(nuevoActivo: boolean) {
    setActivo(nuevoActivo);
    startTransition(async () => {
      try {
        throwIfActionError(await actualizarOfertaActivo(oferta.id, nuevoActivo));
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

export function OfertasTable({ productos }: { productos: Producto[] }) {
  const table = useOfertasTable();
  const nombreProducto = (id: string) => productos.find((p) => p.id === id)?.nombre ?? "—";

  const columns = useMemo<ColumnDef<OfertaConItems, unknown>[]>(
    () => [
      { accessorKey: "nombre", header: "Nombre" },
      {
        id: "combo",
        header: "Combo",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.items
              .map((i) => `${i.cantidad_requerida} ${nombreProducto(i.producto_id)}`)
              .join(" + ")}
          </span>
        ),
      },
      {
        accessorKey: "tipo_beneficio",
        header: "Beneficio",
        cell: ({ row }) => ETIQUETA_BENEFICIO[row.original.tipo_beneficio],
      },
      { accessorKey: "valor_beneficio", header: "Valor" },
      {
        accessorKey: "max_aplicaciones_por_venta",
        header: "Máx./venta",
        cell: ({ row }) => row.original.max_aplicaciones_por_venta ?? "sin límite",
      },
      {
        accessorKey: "activo",
        header: "Activa",
        cell: ({ row }) => <ActivaCell oferta={row.original} />,
      },
      {
        id: "acciones",
        header: "",
        cell: ({ row }) => (
          <OfertaDialog productos={productos} oferta={row.original} onSaved={table.refetch} />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productos],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <OfertaDialog productos={productos} onSaved={table.refetch} />
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
        emptyMessage="No hay ofertas cargadas."
      />
    </div>
  );
}
