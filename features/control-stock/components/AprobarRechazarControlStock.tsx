"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
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
import { aprobarControlStock, rechazarControlStock } from "@/features/control-stock/actions";
import { getErrorMessage } from "@/lib/errors";
import { throwIfActionError } from "@/lib/actionResult";

// E11-4: solo llega acá un administrador (guard de /admin/layout.tsx + requireAdmin() dentro de
// las dos server actions) -- aprobar dispara el ajuste real de stock (E11-3), rechazar solo deja
// registro, ninguno de los dos toca nada hasta que el admin confirma explícitamente.
export function AprobarRechazarControlStock({ controlStockId }: { controlStockId: string }) {
  const [openAprobar, setOpenAprobar] = useState(false);
  const [openRechazar, setOpenRechazar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleAprobar() {
    setIsLoading(true);
    setError(null);
    try {
      throwIfActionError(await aprobarControlStock(controlStockId));
      setOpenAprobar(false);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo aprobar el control"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRechazar() {
    setIsLoading(true);
    setError(null);
    try {
      throwIfActionError(await rechazarControlStock(controlStockId));
      setOpenRechazar(false);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo rechazar el control"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Dialog open={openRechazar} onOpenChange={setOpenRechazar}>
          <DialogTrigger render={<Button variant="destructive" />}>
            <X className="size-4" />
            Rechazar
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rechazar control de stock</DialogTitle>
              <DialogDescription>
                Queda registrado para análisis, pero no se ajusta ningún stock.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="destructive" disabled={isLoading} onClick={handleRechazar}>
                {isLoading ? "Rechazando..." : "Confirmar rechazo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={openAprobar} onOpenChange={setOpenAprobar}>
          <DialogTrigger render={<Button />}>
            <Check className="size-4" />
            Aprobar
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aprobar control de stock</DialogTitle>
              <DialogDescription>
                Ajusta el stock_actual de cada producto con diferencia al valor contado, y deja
                el movimiento de auditoría correspondiente. No se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button disabled={isLoading} onClick={handleAprobar}>
                {isLoading ? "Aprobando..." : "Confirmar aprobación"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
