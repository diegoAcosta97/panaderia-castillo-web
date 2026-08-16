"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Printer } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { ListadoImprimible } from "@/components/print/ListadoImprimible";
import { Button } from "@/components/ui/button";
import { useIngresosMercaderiaTable } from "@/features/ingreso-mercaderia/hooks/useIngresosMercaderiaTable";
import { listIngresosMercaderia } from "@/repositories/ingresoMercaderiaRepository";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import type { IngresoMercaderia } from "@/repositories/ingresoMercaderiaRepository";

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente_aprobacion: "Pendiente de aprobación",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export function IngresosMercaderiaTable() {
  const table = useIngresosMercaderiaTable();
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
      const ingresos = await listIngresosMercaderia(supabase);
      setListado(
        ingresos.map((i) => [
          new Date(i.fecha).toLocaleString("es-AR"),
          ETIQUETA_ESTADO[i.estado] ?? i.estado,
          i.observaciones || "",
        ]),
      );
    } catch (err) {
      setErrorExport(getErrorMessage(err, "No se pudo generar el listado."));
    } finally {
      setExportando(false);
    }
  }

  const columns = useMemo<ColumnDef<IngresoMercaderia, unknown>[]>(
    () => [
      {
        accessorKey: "fecha",
        header: "Fecha",
        cell: ({ row }) => new Date(row.original.fecha).toLocaleString("es-AR"),
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
          <Link href={`/admin/ingresos-mercaderia/${row.original.id}`} className="text-sm underline">
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
        emptyMessage="Todavía no se registró ningún ingreso de mercadería."
      />
    </div>
    {listado && (
      <ListadoImprimible
        titulo="Ingresos de mercadería"
        headers={["Fecha", "Estado", "Observaciones"]}
        rows={listado}
      />
    )}
    </>
  );
}
