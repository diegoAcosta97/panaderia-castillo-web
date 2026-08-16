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
import { eliminarProducto } from "@/features/productos/actions";
import { getErrorMessage } from "@/lib/errors";
import { throwIfActionError } from "@/lib/actionResult";
import type { Producto } from "@/repositories/productosRepository";

// Borrado real, no el toggle de "Activo" -- por eso pide confirmación (RF pedido explícitamente:
// "antes de eliminar que me pida confirmacion"). Si el producto tiene historial (ventas,
// movimientos de stock, etc.) la Server Action lo rechaza con un mensaje claro en vez de dejar
// pasar un borrado que corrompería reportes pasados -- ver productos_delete_admin.
export function EliminarProductoDialog({
  producto,
  onEliminado,
}: {
  producto: Producto;
  onEliminado: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleEliminar() {
    setIsLoading(true);
    setError(null);
    try {
      throwIfActionError(await eliminarProducto(producto.id));
      setOpen(false);
      onEliminado();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo eliminar el producto"));
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
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" title="Eliminar producto" />}>
        <Trash2 className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar producto</DialogTitle>
          <DialogDescription>
            Se va a eliminar &quot;{producto.nombre}&quot; del catálogo. Esta acción no se puede
            deshacer. Si tiene ventas u otro historial asociado, no se va a poder eliminar --
            desactivalo en cambio.
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
