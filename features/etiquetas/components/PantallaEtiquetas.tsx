"use client";

import { useState } from "react";
import { RotateCcw, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScannerInput } from "@/features/ventas/components/ScannerInput";
import { HojaEtiquetas } from "@/features/etiquetas/components/HojaEtiquetas";
import { BotonImprimir } from "@/features/etiquetas/components/BotonImprimir";
import { useGenerarLote } from "@/features/etiquetas/hooks/useGenerarLote";
import type { Producto } from "@/repositories/productosRepository";
import type { ResultadoGenerarLote } from "@/repositories/etiquetasRepository";
import { formatearMoneda } from "@/lib/format";

function fechaPorDefecto(dias: number | null): string {
  if (!dias) return "";
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

export function PantallaEtiquetas() {
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState("20");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [lote, setLote] = useState<ResultadoGenerarLote | null>(null);
  const { generar, error, isLoading } = useGenerarLote();

  function handleSeleccionar(p: Producto) {
    setProducto(p);
    setFechaVencimiento(fechaPorDefecto(p.dias_vencimiento_default));
    setLote(null);
  }

  async function handleGenerar() {
    if (!producto) return;
    const resultado = await generar({
      productoId: producto.id,
      cantidad: Number(cantidad),
      fechaVencimiento: fechaVencimiento || null,
    });
    if (resultado) setLote(resultado);
  }

  if (lote && producto) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between p-6 pb-0 print:hidden">
          <Button type="button" variant="outline" onClick={() => setLote(null)}>
            <RotateCcw className="size-4" />
            Generar otro lote
          </Button>
          <BotonImprimir />
        </div>
        <HojaEtiquetas
          nombre={producto.nombre}
          precio={lote.precio_impreso}
          codigoBarras={producto.codigo_barras}
          fechaVencimiento={lote.fecha_vencimiento}
          cantidad={lote.cantidad}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Generar etiquetas</h1>
      <ScannerInput onSeleccionar={handleSeleccionar} />

      {producto && (
        <div className="flex max-w-sm flex-col gap-4">
          <p className="text-sm">
            Producto: <span className="font-medium">{producto.nombre}</span> (
            {formatearMoneda(producto.precio)})
          </p>
          <div className="grid gap-2">
            <Label htmlFor="cantidad">Cantidad de etiquetas</Label>
            <Input
              id="cantidad"
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fecha-vencimiento">Fecha de vencimiento (opcional)</Label>
            <Input
              id="fecha-vencimiento"
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="button"
            onClick={handleGenerar}
            disabled={isLoading || !cantidad || Number(cantidad) <= 0}
            className="w-fit"
          >
            <Tags className="size-4" />
            {isLoading ? "Generando..." : "Generar etiquetas"}
          </Button>
        </div>
      )}
    </div>
  );
}
