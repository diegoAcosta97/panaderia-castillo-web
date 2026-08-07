"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
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
import { anularVenta } from "@/features/ventas/actions";
import { getErrorMessage } from "@/lib/errors";

export function AnularVentaDialog({ ventaId }: { ventaId: string }) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await anularVenta(ventaId, motivo);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo anular la venta"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>
        <Ban className="size-4" />
        Anular venta
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Anular venta</DialogTitle>
            <DialogDescription>
              Devuelve el stock descontado. No gestiona el reintegro del dinero (si corresponde
              hacerlo, se resuelve por fuera del sistema).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="motivo-anulacion">Motivo</Label>
            <Input
              id="motivo-anulacion"
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={isLoading}>
              {isLoading ? "Anulando..." : "Confirmar anulación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
