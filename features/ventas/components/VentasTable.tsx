"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Printer } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { ListadoImprimible } from "@/components/print/ListadoImprimible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVentasTable } from "@/features/ventas/hooks/useVentasTable";
import { listVentas } from "@/repositories/ventasRepository";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import { formatearMoneda } from "@/lib/format";
import type { Venta } from "@/repositories/ventasRepository";
import type { CajaTurno } from "@/repositories/cajaTurnosRepository";
import type { MedioPago } from "@/types/database";

const ETIQUETA_ESTADO: Record<string, string> = {
  completada: "Completada",
  pendiente_pago: "Pendiente de pago",
  anulada: "Anulada",
};

const ETIQUETA_MEDIO: Record<MedioPago, string> = {
  efectivo: "Efectivo",
  mercado_pago: "Mercado Pago",
  sena_pedido: "Seña (pedido por encargo)",
  tarjeta_debito: "Tarjeta de débito",
  tarjeta_credito: "Tarjeta de crédito",
};

const MEDIOS_PAGO: MedioPago[] = [
  "efectivo",
  "mercado_pago",
  "tarjeta_debito",
  "tarjeta_credito",
  "sena_pedido",
];

export function VentasTable({
  turnos,
  basePath = "/admin/ventas",
  turnoBloqueadoId,
}: {
  turnos: CajaTurno[];
  basePath?: string;
  // Vendedor en /pos/ventas (RF del dueño): solo puede ver la caja abierta, sin poder tocar
  // ningún filtro ni exportar -- turno de caja, fecha y tipo de cobro no se pueden reasignar
  // (ver useVentasTable), y el botón de exportar directamente no se renderiza.
  turnoBloqueadoId?: string;
}) {
  const table = useVentasTable({ cajaTurnoIdFijo: turnoBloqueadoId });
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
      const ventas = await listVentas(supabase, {
        cajaTurnoId: table.cajaTurnoId || undefined,
        desde: table.desde || undefined,
        hasta: table.hasta || undefined,
        medioPago: table.medioPago || undefined,
      });
      const filas: (string | number)[][] = ventas.map((v) => [
        v.numero_comprobante,
        new Date(v.fecha).toLocaleString("es-AR"),
        formatearMoneda(v.subtotal),
        formatearMoneda(v.total_ofertas),
        formatearMoneda(v.total_descuentos),
        formatearMoneda(v.total),
        ETIQUETA_ESTADO[v.estado] ?? v.estado,
      ]);
      if (table.hayFiltro && table.resumen) {
        filas.push(["", "", "", "", "", "", ""]);
        for (const s of table.resumen.subtotalesPorMedioPago) {
          filas.push([
            "",
            table.resumen.subtotalesPorMedioPago.length > 1
              ? `Subtotal ${ETIQUETA_MEDIO[s.medioPago]}`
              : `Total ${ETIQUETA_MEDIO[s.medioPago]}`,
            "",
            "",
            "",
            formatearMoneda(s.monto),
            "",
          ]);
        }
        if (table.resumen.subtotalesPorMedioPago.length > 1) {
          filas.push(["", "Total general", "", "", "", formatearMoneda(table.resumen.total), ""]);
        }
      }
      setListado(filas);
    } catch (err) {
      setErrorExport(getErrorMessage(err, "No se pudo generar el listado."));
    } finally {
      setExportando(false);
    }
  }

  const columns = useMemo<ColumnDef<Venta, unknown>[]>(
    () => [
      { accessorKey: "numero_comprobante", header: "N.º" },
      {
        accessorKey: "fecha",
        header: "Fecha",
        cell: ({ row }) => new Date(row.original.fecha).toLocaleString("es-AR"),
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => formatearMoneda(row.original.total),
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
          <div className="flex gap-3">
            <Link href={`${basePath}/${row.original.id}`} className="text-sm underline">
              Ver
            </Link>
            <Link
              href={`/pos/comprobante/${row.original.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline"
            >
              Comprobante
            </Link>
          </div>
        ),
      },
    ],
    [basePath],
  );

  return (
    <>
    <div className="flex flex-col gap-4 print:hidden">
      {turnoBloqueadoId ? (
        <p className="text-sm text-muted-foreground">Ventas del turno de caja abierto.</p>
      ) : (
        <>
          {/* Select nativo a propósito, mismo criterio que en el resto del proyecto. */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-2">
              <Label htmlFor="cajaTurnoId">Turno de caja</Label>
              <select
                id="cajaTurnoId"
                value={table.cajaTurnoId}
                onChange={(e) => table.setCajaTurnoId(e.target.value)}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">Todos</option>
                {turnos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fecha} {t.etiqueta_turno ? `— ${t.etiqueta_turno}` : ""}
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
            <div className="grid gap-2">
              <Label htmlFor="medioPago">Tipo de cobro</Label>
              <select
                id="medioPago"
                value={table.medioPago}
                onChange={(e) => table.setMedioPago(e.target.value as MedioPago | "")}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">Todos</option>
                {MEDIOS_PAGO.map((m) => (
                  <option key={m} value={m}>
                    {ETIQUETA_MEDIO[m]}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" variant="outline" onClick={exportarImprimible} disabled={exportando}>
              <Printer className="size-4" />
              {exportando ? "Generando..." : "Exportar listado"}
            </Button>
          </div>

          {errorExport && <p className="text-sm text-destructive">{errorExport}</p>}
        </>
      )}

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
        emptyMessage="No hay ventas que coincidan con el filtro."
      />

      {table.hayFiltro && (
        <div className="flex flex-col gap-1 rounded-lg border p-4 text-sm">
          {table.resumenLoading ? (
            <span className="text-muted-foreground">Calculando total...</span>
          ) : table.resumen && table.resumen.subtotalesPorMedioPago.length > 0 ? (
            <>
              {table.resumen.subtotalesPorMedioPago.length > 1 ? (
                <>
                  {table.resumen.subtotalesPorMedioPago.map((s) => (
                    <div key={s.medioPago} className="flex justify-between text-muted-foreground">
                      <span>Subtotal {ETIQUETA_MEDIO[s.medioPago]}</span>
                      <span>{formatearMoneda(s.monto)}</span>
                    </div>
                  ))}
                  <div className="mt-1 flex justify-between border-t pt-1 text-base font-semibold">
                    <span>Total general</span>
                    <span>{formatearMoneda(table.resumen.total)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-base font-semibold">
                  <span>Total {ETIQUETA_MEDIO[table.resumen.subtotalesPorMedioPago[0].medioPago]}</span>
                  <span>{formatearMoneda(table.resumen.total)}</span>
                </div>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">
              No hay ventas completadas que coincidan con el filtro.
            </span>
          )}
        </div>
      )}
    </div>
    {listado && (
      <ListadoImprimible
        titulo="Ventas"
        headers={["N.º comprobante", "Fecha", "Subtotal", "Ofertas", "Descuentos", "Total", "Estado"]}
        rows={listado}
      />
    )}
    </>
  );
}
