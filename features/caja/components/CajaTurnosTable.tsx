"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Printer } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { ListadoImprimible } from "@/components/print/ListadoImprimible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCajaTurnosTable } from "@/features/caja/hooks/useCajaTurnosTable";
import { listTurnos } from "@/repositories/cajaTurnosRepository";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import { formatearMoneda } from "@/lib/format";
import type { CajaTurno } from "@/repositories/cajaTurnosRepository";

const ETIQUETA_ESTADO: Record<string, string> = { abierta: "Abierta", cerrada: "Cerrada" };
const TURNOS = ["Mañana", "Tarde"];

export function CajaTurnosTable() {
  const table = useCajaTurnosTable();
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
      const turnos = await listTurnos(supabase, {
        desde: table.desde || undefined,
        hasta: table.hasta || undefined,
        etiquetaTurno: table.turno === table.todosValue ? undefined : table.turno,
      });
      setListado(
        turnos.map((t) => [
          t.fecha,
          t.etiqueta_turno || "",
          ETIQUETA_ESTADO[t.estado] ?? t.estado,
          formatearMoneda(t.monto_apertura),
          t.monto_cierre_declarado != null ? formatearMoneda(t.monto_cierre_declarado) : "",
          t.efectivo_esperado != null ? formatearMoneda(t.efectivo_esperado) : "",
          t.diferencia != null ? formatearMoneda(t.diferencia) : "",
        ]),
      );
    } catch (err) {
      setErrorExport(getErrorMessage(err, "No se pudo generar el listado."));
    } finally {
      setExportando(false);
    }
  }

  const columns = useMemo<ColumnDef<CajaTurno, unknown>[]>(
    () => [
      { accessorKey: "fecha", header: "Fecha" },
      {
        accessorKey: "etiqueta_turno",
        header: "Turno",
        cell: ({ row }) => row.original.etiqueta_turno || "—",
      },
      { accessorKey: "estado", header: "Estado" },
      {
        accessorKey: "monto_apertura",
        header: "Apertura",
        cell: ({ row }) => formatearMoneda(row.original.monto_apertura),
      },
      {
        accessorKey: "monto_cierre_declarado",
        header: "Cierre declarado",
        cell: ({ row }) =>
          row.original.monto_cierre_declarado != null
            ? formatearMoneda(row.original.monto_cierre_declarado)
            : "—",
      },
      {
        accessorKey: "efectivo_esperado",
        header: "Esperado",
        cell: ({ row }) =>
          row.original.efectivo_esperado != null
            ? formatearMoneda(row.original.efectivo_esperado)
            : "—",
      },
      {
        accessorKey: "diferencia",
        header: "Diferencia",
        cell: ({ row }) => (
          <span
            className={
              row.original.diferencia != null && row.original.diferencia !== 0
                ? "font-medium text-destructive"
                : undefined
            }
          >
            {row.original.diferencia != null ? formatearMoneda(row.original.diferencia) : "—"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
    <div className="flex flex-col gap-4 print:hidden">
      <div className="flex flex-wrap items-end gap-2">
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
        <div className="grid gap-2">
          <Label htmlFor="turno-filtro">Turno</Label>
          <Select value={table.turno} onValueChange={(v) => v && table.setTurno(v)}>
            <SelectTrigger id="turno-filtro" className="w-40">
              <SelectValue>
                {(value: string) => (value === table.todosValue ? "Todos" : value)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={table.todosValue}>Todos</SelectItem>
              {TURNOS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
        emptyMessage="No hay turnos que coincidan con el filtro."
      />
    </div>
    {listado && (
      <ListadoImprimible
        titulo="Historial de caja"
        headers={["Fecha", "Turno", "Estado", "Apertura", "Cierre declarado", "Esperado", "Diferencia"]}
        rows={listado}
      />
    )}
    </>
  );
}
