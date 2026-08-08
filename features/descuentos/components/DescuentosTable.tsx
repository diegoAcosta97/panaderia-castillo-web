"use client";

import { useMemo, useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/DataTable";
import { Checkbox } from "@/components/ui/checkbox";
import { DescuentoDialog } from "@/features/descuentos/components/DescuentoDialog";
import { actualizarDescuentoActivo } from "@/features/descuentos/actions";
import { useDescuentosTable } from "@/features/descuentos/hooks/useDescuentosTable";
import type { Producto } from "@/repositories/productosRepository";
import type { Categoria } from "@/repositories/categoriasRepository";
import type { DescuentoConCondiciones, DescuentoCondicion } from "@/repositories/descuentosRepository";

function ActivoCell({ descuento }: { descuento: DescuentoConCondiciones }) {
  const [isPending, startTransition] = useTransition();
  const [activo, setActivo] = useState(descuento.activo);

  function handleActivoChange(nuevoActivo: boolean) {
    setActivo(nuevoActivo);
    startTransition(() => actualizarDescuentoActivo(descuento.id, nuevoActivo));
  }

  return (
    <Checkbox
      checked={activo}
      onCheckedChange={(checked) => handleActivoChange(checked === true)}
      disabled={isPending}
    />
  );
}

export function DescuentosTable({
  productos,
  categorias,
}: {
  productos: Producto[];
  categorias: Categoria[];
}) {
  const table = useDescuentosTable();

  function describirCondicion(c: DescuentoCondicion): string {
    if (c.tipo_condicion === "monto_minimo") return `total ≥ $${c.monto_minimo}`;
    if (c.tipo_condicion === "producto_incluido") {
      const nombre = productos.find((p) => p.id === c.producto_id)?.nombre ?? "—";
      return `≥ ${c.cantidad_minima ?? 1} ${nombre}`;
    }
    const nombre = categorias.find((cat) => cat.id === c.categoria_id)?.nombre ?? "—";
    return `≥ ${c.cantidad_minima ?? 1} de "${nombre}"`;
  }

  const columns = useMemo<ColumnDef<DescuentoConCondiciones, unknown>[]>(
    () => [
      { accessorKey: "nombre", header: "Nombre" },
      {
        id: "condiciones",
        header: "Condiciones",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.condiciones.map(describirCondicion).join(" Y ")}
          </span>
        ),
      },
      {
        id: "efecto",
        header: "Efecto",
        cell: ({ row }) =>
          row.original.tipo_efecto === "porcentaje"
            ? `${row.original.valor_efecto}%`
            : `$${row.original.valor_efecto}`,
      },
      {
        accessorKey: "activo",
        header: "Activo",
        cell: ({ row }) => <ActivoCell descuento={row.original} />,
      },
      {
        id: "acciones",
        header: "",
        cell: ({ row }) => (
          <DescuentoDialog
            productos={productos}
            categorias={categorias}
            descuento={row.original}
            onSaved={table.refetch}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productos, categorias],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <DescuentoDialog productos={productos} categorias={categorias} onSaved={table.refetch} />
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
        emptyMessage="No hay descuentos cargados."
      />
    </div>
  );
}
