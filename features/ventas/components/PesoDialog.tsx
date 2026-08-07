"use client";

import { useState } from "react";
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

// RF-1.2/E7-4: un producto "por peso" pide el peso antes de agregarse al carrito.
export function PesoDialog({
  producto,
  onConfirmar,
  onCancelar,
}: {
  producto: Producto;
  onConfirmar: (peso: number) => void;
  onCancelar: () => void;
}) {
  const [peso, setPeso] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valor = Number(peso);
    if (valor > 0) onConfirmar(valor);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancelar()}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Peso de {producto.nombre}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="peso-kg">Peso (kg)</Label>
            <Input
              id="peso-kg"
              type="number"
              min="0.001"
              step="0.001"
              autoFocus
              required
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit">Agregar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
