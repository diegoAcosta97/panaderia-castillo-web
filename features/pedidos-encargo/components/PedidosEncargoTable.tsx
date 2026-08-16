"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Filter, Ban, Printer } from "lucide-react";
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
import { usePedidosEncargoTable } from "@/features/pedidos-encargo/hooks/usePedidosEncargoTable";
import { RegistrarSenaDialog } from "@/features/pedidos-encargo/components/RegistrarSenaDialog";
import { cancelarPedidoEncargo, listPedidosEncargo } from "@/repositories/pedidosEncargoRepository";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import { formatearMoneda } from "@/lib/format";
import type { PedidoEncargoConDetalle } from "@/repositories/pedidosEncargoRepository";
import type { Producto } from "@/repositories/productosRepository";

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Pendiente",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export function PedidosEncargoTable({ productos }: { productos: Producto[] }) {
  const table = usePedidosEncargoTable();
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [errorExport, setErrorExport] = useState<string | null>(null);
  const [listado, setListado] = useState<(string | number)[][] | null>(null);

  const totalEstimado = (pedido: PedidoEncargoConDetalle) =>
    pedido.items.reduce((acc, item) => {
      const producto = productos.find((p) => p.id === item.producto_id);
      return acc + (producto ? Number(producto.precio) * Number(item.cantidad) : 0);
    }, 0);

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
      const pedidos = await listPedidosEncargo(supabase, {
        estado: table.estado === table.todosValue ? undefined : (table.estado as PedidoEncargoConDetalle["estado"]),
        texto: table.texto || undefined,
      });
      setListado(
        pedidos.map((p) => [
          p.cliente_nombre,
          p.cliente_telefono || "",
          new Date(`${p.fecha_entrega}T00:00:00`).toLocaleDateString("es-AR"),
          p.items
            .map((item) => {
              const producto = productos.find((prod) => prod.id === item.producto_id);
              return `${item.cantidad} ${producto?.nombre ?? "—"}`;
            })
            .join(", "),
          formatearMoneda(totalEstimado(p)),
          formatearMoneda(p.sena_total),
          formatearMoneda(totalEstimado(p) - p.sena_total),
          ETIQUETA_ESTADO[p.estado] ?? p.estado,
        ]),
      );
    } catch (err) {
      setErrorExport(getErrorMessage(err, "No se pudo generar el listado."));
    } finally {
      setExportando(false);
    }
  }

  async function handleCancelar(pedidoId: string) {
    setError(null);
    try {
      const supabase = createClient();
      await cancelarPedidoEncargo(supabase, pedidoId);
      table.refetch();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cancelar el pedido."));
    }
  }

  const columns = useMemo<ColumnDef<PedidoEncargoConDetalle, unknown>[]>(
    () => [
      { accessorKey: "cliente_nombre", header: "Cliente" },
      {
        id: "telefono",
        header: "Teléfono",
        cell: ({ row }) => row.original.cliente_telefono || "—",
      },
      {
        accessorKey: "fecha_entrega",
        header: "Entrega",
        cell: ({ row }) => new Date(`${row.original.fecha_entrega}T00:00:00`).toLocaleDateString("es-AR"),
      },
      {
        id: "productos",
        header: "Productos",
        cell: ({ row }) =>
          row.original.items
            .map((item) => {
              const producto = productos.find((p) => p.id === item.producto_id);
              return `${item.cantidad} ${producto?.nombre ?? "—"}`;
            })
            .join(", "),
      },
      {
        id: "total",
        header: "Total estimado",
        cell: ({ row }) => formatearMoneda(totalEstimado(row.original)),
      },
      {
        id: "sena",
        header: "Seña cobrada",
        cell: ({ row }) => formatearMoneda(row.original.sena_total),
      },
      {
        id: "saldo",
        header: "Saldo",
        cell: ({ row }) => formatearMoneda(totalEstimado(row.original) - row.original.sena_total),
      },
      {
        id: "estado",
        header: "Estado",
        cell: ({ row }) => ETIQUETA_ESTADO[row.original.estado] ?? row.original.estado,
      },
      {
        id: "acciones",
        header: "",
        cell: ({ row }) =>
          row.original.estado === "pendiente" ? (
            <div className="flex gap-2">
              <RegistrarSenaDialog pedido={row.original} onRegistrada={table.refetch} />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => handleCancelar(row.original.id)}
                title="Cancelar pedido"
              >
                <Ban className="size-4" />
              </Button>
            </div>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productos, table.refetch],
  );

  return (
    <>
    <div className="flex flex-col gap-4 print:hidden">
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-2">
          <Label htmlFor="pedido-estado">Estado</Label>
          <Select value={table.estado} onValueChange={(v) => v && table.setEstado(v)}>
            <SelectTrigger id="pedido-estado" className="w-40">
              <SelectValue>
                {(value: string) => ETIQUETA_ESTADO[value] ?? "Todos"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={table.todosValue}>Todos</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="entregado">Entregado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pedido-texto">Cliente</Label>
          <Input
            id="pedido-texto"
            placeholder="Nombre o teléfono"
            value={table.texto}
            onChange={(e) => table.setTexto(e.target.value)}
          />
        </div>
        {(table.estado !== "pendiente" || table.texto) && (
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

      {error && <p className="text-sm text-destructive">{error}</p>}
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
        emptyMessage="No hay pedidos que coincidan con el filtro."
      />
    </div>
    {listado && (
      <ListadoImprimible
        titulo="Pedidos por encargo"
        headers={["Cliente", "Teléfono", "Entrega", "Productos", "Total estimado", "Seña cobrada", "Saldo", "Estado"]}
        rows={listado}
      />
    )}
    </>
  );
}
