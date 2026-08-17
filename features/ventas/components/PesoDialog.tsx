"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Producto } from "@/repositories/productosRepository";
import { formatearMoneda } from "@/lib/format";

type Modo = "peso" | "monto";

// RF-1.2/E7-4: un producto "por peso" pide el peso antes de agregarse al carrito. También se
// puede cargar por monto ("$1000 de pan") -- el peso se redondea al gramo (numeric(12,3), ver
// docs/data-model.md) para poder guardarse, lo que casi nunca reproduce el monto tipeado exacto
// a precio de catálogo (ej. $1000 a $3500/kg redondea a 0,286 kg = $1001, no $1000). En vez de
// resignar esa diferencia, se ajusta el precio de ESTA pesada puntual (precioUnitario) para que
// peso * precioUnitario dé justo el monto pedido -- confirmar_venta valida que el ajuste sea
// mínimo (mismo criterio que Carrito.resolverDesdeSubtotal) antes de aceptarlo.
export function PesoDialog({
  producto,
  onConfirmar,
  onCancelar,
}: {
  producto: Producto;
  onConfirmar: (peso: number, precioUnitario?: number) => void;
  onCancelar: () => void;
}) {
  const [modo, setModo] = useState<Modo>("peso");
  const [peso, setPeso] = useState("");
  const [monto, setMonto] = useState("");

  const pesoCalculado =
    modo === "monto"
      ? Math.max(0.001, Math.round(((Number(monto) || 0) / producto.precio) * 1000) / 1000)
      : Number(peso);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pesoCalculado <= 0) return;
    if (modo === "monto") {
      const precioUnitario = Math.round(((Number(monto) || 0) / pesoCalculado) * 100) / 100;
      onConfirmar(pesoCalculado, precioUnitario);
    } else {
      onConfirmar(pesoCalculado);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancelar()}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{producto.nombre}</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={modo === "peso" ? "default" : "outline"}
              onClick={() => setModo("peso")}
            >
              Por peso
            </Button>
            <Button
              type="button"
              variant={modo === "monto" ? "default" : "outline"}
              onClick={() => setModo("monto")}
            >
              Por monto
            </Button>
          </div>

          {modo === "peso" ? (
            <div className="grid gap-2">
              <Label htmlFor="peso-kg">Peso (kg)</Label>
              <Input
                id="peso-kg"
                type="number"
                min="0.01"
                step="0.01"
                autoFocus
                required
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="monto-pesado">Monto ($)</Label>
              <Input
                id="monto-pesado"
                type="number"
                min="0.01"
                step="0.01"
                autoFocus
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
              {pesoCalculado > 0 && (
                <p className="text-sm text-muted-foreground">
                  ≈ {pesoCalculado.toFixed(3)} kg (a {formatearMoneda(producto.precio)}/kg) — se cobra el
                  monto exacto de arriba
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="submit">
              <Plus className="size-4" />
              Agregar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
