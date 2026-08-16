"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Printer } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { ListadoImprimible } from "@/components/print/ListadoImprimible";
import { Button } from "@/components/ui/button";
import { useControlesStockTable } from "@/features/control-stock/hooks/useControlesStockTable";
import { listControlesStock } from "@/repositories/controlStockRepository";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import type { ControlStock } from "@/repositories/controlStockRepository";

const ETIQUETA_ESTADO: Record<string, string> = {
  en_progreso: "En progreso",
  pendiente_aprobacion: "Pendiente de aprobación",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export function ControlesStockTable() {
  const table = useControlesStockTable();
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
      const controles = await listControlesStock(supabase);
      setListado(
        controles.map((c) => [
          new Date(c.fecha_inicio).toLocaleString("es-AR"),
          ETIQUETA_ESTADO[c.estado] ?? c.estado,
          c.observaciones || "",
        ]),
      );
    } catch (err) {
      setErrorExport(getErrorMessage(err, "No se pudo generar el listado."));
    } finally {
      setExportando(false);
    }
  }

  const columns = useMemo<ColumnDef<ControlStock, unknown>[]>(
    () => [
      {
        accessorKey: "fecha_inicio",
        header: "Fecha inicio",
        cell: ({ row }) => new Date(row.original.fecha_inicio).toLocaleString("es-AR"),
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
          <Link href={`/admin/control-stock/${row.original.id}`} className="text-sm underline">
            Ver
          </Link>
        ),
      },
    ],
    [],
  );

  return (
    <>
    <div className="flex flex-col gap-4 print:hidden">
      <div className="flex justify-end">
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
        emptyMessage="Todavía no se registró ningún control."
      />
    </div>
    {listado && (
      <ListadoImprimible
        titulo="Controles de stock"
        headers={["Fecha inicio", "Estado", "Observaciones"]}
        rows={listado}
      />
    )}
    </>
  );
}
