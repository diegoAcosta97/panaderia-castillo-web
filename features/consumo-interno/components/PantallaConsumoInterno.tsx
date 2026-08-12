"use client";

import { useState } from "react";
import { PackageMinus, RotateCcw } from "lucide-react";
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
import { ScannerInput } from "@/features/ventas/components/ScannerInput";
import { useRegistrarConsumoInterno } from "@/features/consumo-interno/hooks/useRegistrarConsumoInterno";
import type { Producto } from "@/repositories/productosRepository";
import type { Empleado } from "@/repositories/empleadosRepository";
import type { ResultadoMovimientoStock } from "@/repositories/movimientosStockRepository";

// E14-5: el Select de Radix no admite value="" -- este sentinel representa "dueño / sin asignar
// a un empleado puntual" y se traduce a empleado_id = null recién al enviar
// (docs/backlog/14-mermas-consumo-interno.md#E14-3: empleado_id es opcional en la función).
const SIN_ASIGNAR = "__sin_asignar__";

export function PantallaConsumoInterno({ empleados }: { empleados: Empleado[] }) {
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState("1");
  const [empleadoId, setEmpleadoId] = useState(SIN_ASIGNAR);
  const [motivo, setMotivo] = useState("");
  const [resultado, setResultado] = useState<ResultadoMovimientoStock | null>(null);
  const { registrar, error, isLoading } = useRegistrarConsumoInterno();

  function handleSeleccionar(p: Producto) {
    setProducto(p);
    setResultado(null);
  }

  function handleNueva() {
    setProducto(null);
    setCantidad("1");
    setEmpleadoId(SIN_ASIGNAR);
    setMotivo("");
    setResultado(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!producto || !motivo.trim()) return;
    const res = await registrar({
      productoId: producto.id,
      cantidad: Number(cantidad),
      empleadoId: empleadoId === SIN_ASIGNAR ? null : empleadoId,
      motivo: motivo.trim(),
    });
    if (res) setResultado(res);
  }

  if (resultado && producto) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <h1 className="text-2xl font-semibold">Consumo interno registrado</h1>
        <p className="max-w-sm text-sm">
          Se descontaron <span className="font-medium">{cantidad}</span> de{" "}
          <span className="font-medium">{producto.nombre}</span>. Stock resultante:{" "}
          <span className="font-medium">{resultado.stock_resultante}</span>.
        </p>
        <Button type="button" variant="outline" className="w-fit" onClick={handleNueva}>
          <RotateCcw className="size-4" />
          Registrar otro consumo
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Registrar consumo interno</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Producto consumido por personal o dueño, sin pasar por una venta. Se descuenta del stock
        del sistema y queda registrado con tu usuario, el motivo y, si corresponde, quién lo
        consumió.
      </p>
      <ScannerInput onSeleccionar={handleSeleccionar} />

      {producto && (
        <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
          <p className="text-sm">
            Producto: <span className="font-medium">{producto.nombre}</span> — stock actual:{" "}
            <span className="font-medium">{producto.stock_actual ?? "—"}</span>
          </p>
          <div className="grid gap-2">
            <Label htmlFor="consumo-cantidad">Cantidad</Label>
            <Input
              id="consumo-cantidad"
              type="number"
              min="0.001"
              step="0.001"
              required
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="consumo-empleado">Empleado</Label>
            <Select value={empleadoId} onValueChange={(v) => v && setEmpleadoId(v)}>
              <SelectTrigger id="consumo-empleado" className="w-full">
                {/* children como función: el label por defecto de Base UI solo se resuelve
                    mientras el popup está (o estuvo) montado -- ver hallazgo en
                    docs/backlog/14-mermas-consumo-interno.md. Resolvemos el label nosotros
                    mismos para no depender de eso. */}
                <SelectValue>
                  {(value: string) =>
                    value === SIN_ASIGNAR
                      ? "Dueño / sin asignar"
                      : (empleados.find((e) => e.id === value)?.nombre ?? value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_ASIGNAR}>Dueño / sin asignar</SelectItem>
                {empleados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="consumo-motivo">Motivo</Label>
            <Input
              id="consumo-motivo"
              placeholder="Ej. Consumo durante el turno"
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleNueva}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !motivo.trim() || Number(cantidad) <= 0}
            >
              <PackageMinus className="size-4" />
              {isLoading ? "Registrando..." : "Registrar consumo"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
