"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import { eliminarProductos } from "@/features/productos/actions";
import { getErrorMessage } from "@/lib/errors";
import { throwIfActionError } from "@/lib/actionResult";

export function EliminarProductosDialog({
  seleccionados,
  onTerminado,
}: {
  seleccionados: Map<string, string>;
  onTerminado: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleEliminar() {
    setIsLoading(true);
    setError(null);
    try {
      const resultado = throwIfActionError(await eliminarProductos([...seleccionados.keys()]));
      onTerminado();
      if (resultado.noEliminados.length === 0) {
        setOpen(false);
      } else {
        const nombres = resultado.noEliminados.map((id) => seleccionados.get(id) ?? id);
        setError(
          `Se eliminaron ${resultado.eliminados.length} de ${seleccionados.size}. No se pudo eliminar (tienen ventas, movimientos de stock u otro historial asociado): ${nombres.join(", ")}. Desactivalos en cambio (columna Activo).`,
        );
      }
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron eliminar los productos"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nuevo) => {
        setOpen(nuevo);
        if (nuevo) setError(null);
      }}
    >
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>
        <Trash2 className="size-4" />
        Eliminar {seleccionados.size} seleccionado{seleccionados.size === 1 ? "" : "s"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar productos seleccionados</DialogTitle>
          <DialogDescription>
            Se van a eliminar {seleccionados.size} producto{seleccionados.size === 1 ? "" : "s"} del
            catálogo. Esta acción no se puede deshacer. Los que tengan ventas u otro historial
            asociado no se van a poder eliminar -- desactivalos en cambio.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="destructive" disabled={isLoading} onClick={handleEliminar}>
            {isLoading ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
