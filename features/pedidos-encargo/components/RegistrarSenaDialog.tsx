"use client";

import { useState } from "react";
import { HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registrarSenaPedido } from "@/repositories/pedidosEncargoRepository";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import type { PedidoEncargo } from "@/repositories/pedidosEncargoRepository";

export function RegistrarSenaDialog({
  pedido,
  onRegistrada,
}: {
  pedido: PedidoEncargo;
  onRegistrada?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [monto, setMonto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      await registrarSenaPedido(supabase, pedido.id, Number(monto));
      setMonto("");
      setOpen(false);
      onRegistrada?.();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo registrar la seña"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="icon-sm" title="Registrar seña" />}>
        <HandCoins className="size-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Registrar seña — {pedido.cliente_nombre}</DialogTitle>
            <DialogDescription>
              En efectivo. Se suma al efectivo esperado del turno abierto ahora.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="sena-monto">Monto</Label>
            <Input
              id="sena-monto"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Registrando..." : "Registrar seña"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
