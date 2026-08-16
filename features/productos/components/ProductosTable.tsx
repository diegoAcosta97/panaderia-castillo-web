"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/DataTable";
import { Checkbox } from "@/components/ui/checkbox";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductoDialog } from "@/features/productos/components/ProductoDialog";
import { actualizarProducto } from "@/features/productos/actions";
import { useProductosTable } from "@/features/productos/hooks/useProductosTable";
import { throwIfActionError } from "@/lib/actionResult";
import { formatearMoneda } from "@/lib/format";
import type { Categoria } from "@/repositories/categoriasRepository";
import type { Producto } from "@/repositories/productosRepository";

function ActivoCell({ producto }: { producto: Producto }) {
  const [isPending, startTransition] = useTransition();
  const [activo, setActivo] = useState(producto.activo);

  function handleActivoChange(nuevoActivo: boolean) {
    setActivo(nuevoActivo);
    startTransition(async () => {
      try {
        throwIfActionError(await actualizarProducto(producto.id, { activo: nuevoActivo }));
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

export function ProductosTable({
  categorias,
}: {
  categorias: Categoria[];
}) {
  const table = useProductosTable();
  const nombreCategoria = (id: string) => categorias.find((c) => c.id === id)?.nombre ?? "—";

  const columns = useMemo<ColumnDef<Producto, unknown>[]>(
    () => [
      {
        accessorKey: "nombre",
        header: "Nombre",
      },
      {
        id: "categoria",
        header: "Categoría",
        cell: ({ row }) => nombreCategoria(row.original.categoria_id),
      },
      {
        accessorKey: "tipo_venta",
        header: "Venta",
        cell: ({ row }) => (row.original.tipo_venta === "peso" ? "Peso (kg)" : "Unidad"),
      },
      {
        accessorKey: "precio",
        header: "Precio",
        cell: ({ row }) => (
          <>
            {formatearMoneda(row.original.precio)}
            {row.original.tipo_venta === "peso" ? "/kg" : ""}
          </>
        ),
      },
      {
        accessorKey: "stock_actual",
        header: "Stock",
        cell: ({ row }) =>
          row.original.controla_stock ? row.original.stock_actual : "sin control",
      },
      {
        accessorKey: "activo",
        header: "Activo",
        cell: ({ row }) => <ActivoCell producto={row.original} />,
      },
      {
        id: "acciones",
        header: "",
        cell: ({ row }) => (
          <ProductoDialog categorias={categorias} producto={row.original} onSaved={table.refetch} />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categorias],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        {/* Selects nativos a propósito, mismo criterio que features/gastos/components/GastosTable.tsx. */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-2">
            <Label htmlFor="categoria-filtro">Categoría</Label>
            <select
              id="categoria-filtro"
              value={table.categoriaId}
              onChange={(e) => table.setCategoriaId(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value={table.todasValue}>Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="activo-filtro">Estado</Label>
            <select
              id="activo-filtro"
              value={table.activo}
              onChange={(e) => table.setActivo(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value={table.todosActivoValue}>Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nombre-filtro">Buscar por nombre</Label>
            <Input
              id="nombre-filtro"
              type="search"
              placeholder="Nombre del producto..."
              value={table.nombreInput}
              onChange={(e) => table.setNombreInput(e.target.value)}
              className="w-56"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/productos/categorias" className={buttonVariants({ variant: "outline" })}>
            Categorías
          </Link>
          <Link href="/admin/productos/reposicion" className={buttonVariants({ variant: "outline" })}>
            Reposición
          </Link>
          <ProductoDialog categorias={categorias} onSaved={table.refetch} />
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
        emptyMessage={
          table.categoriaId !== table.todasValue ||
          table.activo !== table.todosActivoValue ||
          table.nombreInput
            ? "No hay productos que coincidan con el filtro."
            : "No hay productos cargados."
        }
      />
    </div>
  );
}
