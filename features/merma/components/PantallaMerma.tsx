"use client";

import { useState } from "react";
import { PackageX, RotateCcw } from "lucide-react";
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
import { useRegistrarMerma } from "@/features/merma/hooks/useRegistrarMerma";
import type { Producto } from "@/repositories/productosRepository";
import type { ResultadoMovimientoStock } from "@/repositories/movimientosStockRepository";

// E14-4: motivos frecuentes como atajo -- "Otro" abre un input de texto libre. El motivo
// enviado a registrar_merma siempre es texto plano, esto es solo azúcar de UI.
const MOTIVOS_FRECUENTES = ["Rotura", "Vencimiento", "Derrame", "Producto deteriorado", "Otro"];

export function PantallaMerma() {
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState("1");
  const [motivoSeleccionado, setMotivoSeleccionado] = useState(MOTIVOS_FRECUENTES[0]);
  const [motivoLibre, setMotivoLibre] = useState("");
  const [resultado, setResultado] = useState<ResultadoMovimientoStock | null>(null);
  const { registrar, error, isLoading } = useRegistrarMerma();

  const motivo = motivoSeleccionado === "Otro" ? motivoLibre.trim() : motivoSeleccionado;

  function handleSeleccionar(p: Producto) {
    setProducto(p);
    setResultado(null);
  }

  function handleNueva() {
    setProducto(null);
    setCantidad("1");
    setMotivoSeleccionado(MOTIVOS_FRECUENTES[0]);
    setMotivoLibre("");
    setResultado(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!producto || !motivo) return;
    const res = await registrar({ productoId: producto.id, cantidad: Number(cantidad), motivo });
    if (res) setResultado(res);
  }

  if (resultado && producto) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <h1 className="text-2xl font-semibold">Merma registrada</h1>
        <p className="max-w-sm text-sm">
          Se descontaron <span className="font-medium">{cantidad}</span> de{" "}
          <span className="font-medium">{producto.nombre}</span>. Stock resultante:{" "}
          <span className="font-medium">{resultado.stock_resultante}</span>.
        </p>
        <Button type="button" variant="outline" className="w-fit" onClick={handleNueva}>
          <RotateCcw className="size-4" />
          Registrar otra merma
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Registrar merma</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Producto roto, vencido o deteriorado. Se descuenta del stock del sistema y queda
        registrado con tu usuario y el motivo.
      </p>
      <ScannerInput onSeleccionar={handleSeleccionar} />

      {producto && (
        <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
          <p className="text-sm">
            Producto: <span className="font-medium">{producto.nombre}</span> — stock actual:{" "}
            <span className="font-medium">{producto.stock_actual ?? "—"}</span>
          </p>
          <div className="grid gap-2">
            <Label htmlFor="merma-cantidad">Cantidad</Label>
            <Input
              id="merma-cantidad"
              type="number"
              min="0.001"
              step="0.001"
              required
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="merma-motivo">Motivo</Label>
            <Select
              value={motivoSeleccionado}
              onValueChange={(v) => v && setMotivoSeleccionado(v)}
            >
              <SelectTrigger id="merma-motivo" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_FRECUENTES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {motivoSeleccionado === "Otro" && (
            <div className="grid gap-2">
              <Label htmlFor="merma-motivo-libre">Especificar motivo</Label>
              <Input
                id="merma-motivo-libre"
                required
                value={motivoLibre}
                onChange={(e) => setMotivoLibre(e.target.value)}
              />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleNueva}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !motivo || Number(cantidad) <= 0}>
              <PackageX className="size-4" />
              {isLoading ? "Registrando..." : "Registrar merma"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
