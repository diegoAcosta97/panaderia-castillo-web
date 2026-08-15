"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Filter, Printer } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { ListadoImprimible } from "@/components/print/ListadoImprimible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGastosTable } from "@/features/gastos/hooks/useGastosTable";
import { listGastos } from "@/repositories/gastosRepository";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import { formatearMoneda } from "@/lib/format";
import type { Gasto } from "@/repositories/gastosRepository";
import type { Proveedor } from "@/repositories/proveedoresRepository";

export function GastosTable({ proveedores }: { proveedores: Proveedor[] }) {
  const table = useGastosTable();
  const nombreProveedor = (id: string) => proveedores.find((p) => p.id === id)?.nombre ?? "—";
  const [exportando, setExportando] = useState(false);
  const [errorExport, setErrorExport] = useState<string | null>(null);
  const [listado, setListado] = useState<(string | number)[][] | null>(null);

  useEffect(() => {
    if (!listado) return;
    const limpiar = () => setListado(null);
    window.addEventListener("afterprint", limpiar);
    window.print();
    return () => window.removeEventListener("afterprint", limpiar);
  }, [listado]);

  async function exportarImprimible() {
    setErrorExport(null);
    setExportando(true);
    try {
      const supabase = createClient();
      const gastos = await listGastos(supabase, {
        proveedorId: table.proveedorId || undefined,
        desde: table.desde || undefined,
        hasta: table.hasta || undefined,
      });
      setListado(
        gastos.map((g) => [
          new Date(g.fecha).toLocaleString("es-AR"),
          nombreProveedor(g.proveedor_id),
          g.concepto,
          formatearMoneda(g.monto),
        ]),
      );
    } catch (err) {
      setErrorExport(getErrorMessage(err, "No se pudo generar el listado."));
    } finally {
      setExportando(false);
    }
  }

  const columns = useMemo<ColumnDef<Gasto, unknown>[]>(
    () => [
      {
        accessorKey: "fecha",
        header: "Fecha",
        cell: ({ row }) => new Date(row.original.fecha).toLocaleString("es-AR"),
      },
      {
        id: "proveedor",
        header: "Proveedor",
        cell: ({ row }) => nombreProveedor(row.original.proveedor_id),
      },
      { accessorKey: "concepto", header: "Concepto" },
      {
        accessorKey: "monto",
        header: "Monto",
        cell: ({ row }) => formatearMoneda(row.original.monto),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [proveedores],
  );

  return (
    <>
    <div className="flex flex-col gap-4 print:hidden">
      {/* Select nativo a propósito, mismo criterio que en el resto del proyecto: no hay
          react-hook-form y este es un select simple sin necesidad del look de shadcn. */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-2">
          <Label htmlFor="proveedorId">Proveedor</Label>
          <select
            id="proveedorId"
            value={table.proveedorId}
            onChange={(e) => table.setProveedorId(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Todos</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
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
        {(table.proveedorId || table.desde || table.hasta) && (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Filter className="size-3.5" />
            Filtros activos
          </p>
        )}
        <Button type="button" variant="outline" onClick={exportarImprimible} disabled={exportando}>
          <Printer className="size-4" />
          {exportando ? "Generando..." : "Exportar listado"}
        </Button>
      </div>

      {errorExport && <p className="text-sm text-destructive">{errorExport}</p>}

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
        emptyMessage="No hay gastos que coincidan con el filtro."
      />

      <p className="text-sm text-muted-foreground">
        Total: <span className="font-medium text-foreground">{formatearMoneda(table.total)}</span> (
        {table.count} {table.count === 1 ? "gasto" : "gastos"})
      </p>
    </div>
    {listado && (
      <ListadoImprimible
        titulo="Gastos"
        headers={["Fecha", "Proveedor", "Concepto", "Monto"]}
        rows={listado}
      />
    )}
    </>
  );
}
