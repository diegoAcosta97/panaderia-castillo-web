"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  buscarPedidosPendientes,
  getItemsPedido,
  sumaSenasPorPedido,
} from "@/repositories/pedidosEncargoRepository";
import { getProductosByIds } from "@/repositories/productosRepository";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import type { PedidoEncargo } from "@/repositories/pedidosEncargoRepository";
import type { Producto } from "@/repositories/productosRepository";

export interface PedidoCargado {
  pedidoId: string;
  clienteNombre: string;
  senaTotal: number;
  items: { producto: Producto; cantidad: number }[];
}

export function CargarPedidoDialog({
  onCargar,
}: {
  onCargar: (pedido: PedidoCargado) => void;
}) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<PedidoEncargo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargandoId, setCargandoId] = useState<string | null>(null);

  async function handleBuscar(valor: string) {
    setTexto(valor);
    setError(null);
    if (valor.trim().length < 2) {
      setResultados([]);
      return;
    }
    try {
      const supabase = createClient();
      setResultados(await buscarPedidosPendientes(supabase, valor.trim()));
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo buscar pedidos"));
    }
  }

  async function handleSeleccionar(pedido: PedidoEncargo) {
    setCargandoId(pedido.id);
    setError(null);
    try {
      const supabase = createClient();
      const [items, senaTotal] = await Promise.all([
        getItemsPedido(supabase, pedido.id),
        sumaSenasPorPedido(supabase, pedido.id),
      ]);
      const productos = await getProductosByIds(
        supabase,
        items.map((i) => i.producto_id),
      );
      onCargar({
        pedidoId: pedido.id,
        clienteNombre: pedido.cliente_nombre,
        senaTotal,
        items: items.map((i) => ({
          producto: productos.find((p) => p.id === i.producto_id)!,
          cantidad: Number(i.cantidad),
        })).filter((i) => i.producto),
      });
      setOpen(false);
      setTexto("");
      setResultados([]);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar el pedido"));
    } finally {
      setCargandoId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <CalendarClock className="size-4" />
        Cargar pedido
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cargar pedido por encargo</DialogTitle>
          <DialogDescription>
            Busca por nombre o teléfono del cliente. Reemplaza el carrito actual.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Nombre o teléfono..."
          value={texto}
          onChange={(e) => handleBuscar(e.target.value)}
          autoFocus
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {resultados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                disabled={cargandoId === p.id}
                onClick={() => handleSeleccionar(p)}
                className="w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
              >
                <span className="font-medium">{p.cliente_nombre}</span>
                {p.cliente_telefono && <span className="text-muted-foreground"> — {p.cliente_telefono}</span>}
                <br />
                <span className="text-xs text-muted-foreground">
                  Entrega: {new Date(`${p.fecha_entrega}T00:00:00`).toLocaleDateString("es-AR")}
                </span>
              </button>
            </li>
          ))}
          {texto.trim().length >= 2 && resultados.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin pedidos pendientes que coincidan.</p>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
