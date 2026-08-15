"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScannerInput } from "@/features/ventas/components/ScannerInput";
import { Carrito } from "@/features/ventas/components/Carrito";
import { useCarrito } from "@/features/ventas/hooks/useCarrito";
import { crearPedidoEncargo } from "@/repositories/pedidosEncargoRepository";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";

const HOY = new Date().toISOString().slice(0, 10);

export function NuevoPedidoForm({ onCreado }: { onCreado?: () => void }) {
  const { renglones, agregarProducto, actualizarCantidad, quitarRenglon, vaciar } = useCarrito();
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState(HOY);
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const total = renglones.reduce((acc, r) => acc + r.cantidad * r.producto.precio, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteNombre.trim() || renglones.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      await crearPedidoEncargo(supabase, {
        clienteNombre: clienteNombre.trim(),
        clienteTelefono: clienteTelefono.trim() || null,
        fechaEntrega,
        notas: notas.trim() || null,
        items: renglones.map((r) => ({ producto_id: r.producto.id, cantidad: r.cantidad })),
      });
      setClienteNombre("");
      setClienteTelefono("");
      setFechaEntrega(HOY);
      setNotas("");
      vaciar();
      onCreado?.();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo crear el pedido"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border p-4">
      <h2 className="text-lg font-medium">Nuevo pedido</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="pedido-cliente">Cliente</Label>
          <Input
            id="pedido-cliente"
            required
            value={clienteNombre}
            onChange={(e) => setClienteNombre(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pedido-telefono">Teléfono (opcional)</Label>
          <Input
            id="pedido-telefono"
            value={clienteTelefono}
            onChange={(e) => setClienteTelefono(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pedido-fecha">Fecha de entrega</Label>
          <Input
            id="pedido-fecha"
            type="date"
            required
            min={HOY}
            value={fechaEntrega}
            onChange={(e) => setFechaEntrega(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="pedido-notas">Notas (opcional)</Label>
        <Input id="pedido-notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
      </div>

      <div className="grid gap-2">
        <Label>Productos</Label>
        <ScannerInput onSeleccionar={(p) => agregarProducto(p, 1)} />
        <Carrito
          renglones={renglones}
          onCantidadChange={actualizarCantidad}
          onQuitar={quitarRenglon}
        />
      </div>

      {renglones.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Total estimado (a precio de hoy): <span className="font-medium text-foreground">${total.toFixed(2)}</span>
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        className="w-fit"
        disabled={isLoading || !clienteNombre.trim() || renglones.length === 0}
      >
        <CalendarPlus className="size-4" />
        {isLoading ? "Guardando..." : "Crear pedido"}
      </Button>
    </form>
  );
}
