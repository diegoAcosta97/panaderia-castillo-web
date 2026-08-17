"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Factory } from "lucide-react";
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
import { crearProduccion } from "@/features/produccion/actions";
import { getErrorMessage } from "@/lib/errors";
import { throwIfActionError } from "@/lib/actionResult";
import type { Producto } from "@/repositories/productosRepository";
import type { Empleado } from "@/repositories/empleadosRepository";

interface ItemForm {
  productoId: string;
  cantidad: string;
}

const HOY = new Date().toISOString().slice(0, 10);

function itemVacio(): ItemForm {
  return { productoId: "", cantidad: "1" };
}

export function NuevaProduccionForm({
  productos,
  empleados,
  onCreada,
}: {
  productos: Producto[];
  empleados: Empleado[];
  onCreada?: () => void;
}) {
  const [empleadoId, setEmpleadoId] = useState("");
  const [fechaPedido, setFechaPedido] = useState(HOY);
  const [fechaEntrega, setFechaEntrega] = useState(HOY);
  const [items, setItems] = useState<ItemForm[]>([itemVacio()]);
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  function actualizarItem(index: number, patch: Partial<ItemForm>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function agregarItem() {
    setItems((prev) => [...prev, itemVacio()]);
  }

  function quitarItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const itemsValidos = items.filter((i) => i.productoId && Number(i.cantidad) > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!empleadoId || itemsValidos.length === 0) return;
    setIsLoading(true);
    setError(null);

    try {
      const resultado = throwIfActionError(
        await crearProduccion({
          empleadoId,
          fechaPedido,
          fechaEntrega,
          items: itemsValidos.map((i) => ({ productoId: i.productoId, cantidad: Number(i.cantidad) })),
          observaciones: observaciones.trim() || null,
        }),
      );
      setEmpleadoId("");
      setFechaPedido(HOY);
      setFechaEntrega(HOY);
      setItems([itemVacio()]);
      setObservaciones("");
      onCreada?.();
      router.push(`/admin/produccion/${resultado.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo crear la producción"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border p-4">
      <h2 className="text-lg font-medium">Nueva producción</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="produccion-empleado">Empleado</Label>
          <Select value={empleadoId} onValueChange={(v) => v && setEmpleadoId(v)}>
            <SelectTrigger id="produccion-empleado" className="w-full">
              <SelectValue>
                {(value: string) =>
                  value ? (empleados.find((e) => e.id === value)?.nombre ?? value) : "Elegí un empleado"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {empleados.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="produccion-fecha-pedido">Fecha de pedido</Label>
          <Input
            id="produccion-fecha-pedido"
            type="date"
            required
            value={fechaPedido}
            onChange={(e) => setFechaPedido(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="produccion-fecha-entrega">Fecha de entrega</Label>
          <Input
            id="produccion-fecha-entrega"
            type="date"
            required
            min={fechaPedido}
            value={fechaEntrega}
            onChange={(e) => setFechaEntrega(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Productos a producir</Label>
        <div className="flex flex-col gap-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Select
                value={item.productoId}
                onValueChange={(v) => v && actualizarItem(index, { productoId: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) =>
                      value ? (productos.find((p) => p.id === value)?.nombre ?? value) : "Producto"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {productos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0.001"
                step="0.001"
                className="w-28"
                value={item.cantidad}
                onChange={(e) => actualizarItem(index, { cantidad: e.target.value })}
              />
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => quitarItem(index)}>
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={agregarItem} className="w-fit">
          <Plus className="size-4" />
          Agregar producto
        </Button>
        {productos.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay productos habilitados para producción. Marcá &quot;Habilitada para
            producción&quot; en las categorías correspondientes desde
            /admin/productos/categorias.
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="produccion-observaciones">Observaciones (opcional)</Label>
        <Input
          id="produccion-observaciones"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        className="w-fit"
        disabled={isLoading || !empleadoId || itemsValidos.length === 0}
      >
        <Factory className="size-4" />
        {isLoading ? "Creando..." : "Crear producción"}
      </Button>
    </form>
  );
}
