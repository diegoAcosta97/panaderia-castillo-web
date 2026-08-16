"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScannerInput } from "@/features/ventas/components/ScannerInput";
import {
  actualizarBloqueoCajaActivo,
  agregarProductoBloqueoCaja,
  quitarProductoBloqueoCaja,
} from "@/features/bloqueo-caja/actions";
import { BLOQUEO_CAJA_MAX_PRODUCTOS } from "@/repositories/bloqueoCajaRepository";
import { getErrorMessage } from "@/lib/errors";
import { throwIfActionError } from "@/lib/actionResult";
import type { BloqueoCajaProducto } from "@/repositories/bloqueoCajaRepository";
import type { Producto } from "@/repositories/productosRepository";

interface ProductoConFila {
  fila: BloqueoCajaProducto;
  producto: Producto;
}

export function BloqueoCajaConfig({
  configuracionId,
  activoInicial,
  productos,
}: {
  configuracionId: string;
  activoInicial: boolean;
  productos: ProductoConFila[];
}) {
  const [activo, setActivo] = useState(activoInicial);
  const [error, setError] = useState<string | null>(null);
  const [isPendingActivo, startTransitionActivo] = useTransition();
  const [isPendingLista, startTransitionLista] = useTransition();

  function handleActivoChange(nuevo: boolean) {
    setActivo(nuevo);
    setError(null);
    startTransitionActivo(async () => {
      try {
        throwIfActionError(await actualizarBloqueoCajaActivo(configuracionId, nuevo));
      } catch (err) {
        setActivo(!nuevo);
        setError(getErrorMessage(err, "No se pudo actualizar el bloqueo de caja"));
      }
    });
  }

  function handleAgregar(producto: Producto) {
    setError(null);
    startTransitionLista(async () => {
      try {
        throwIfActionError(await agregarProductoBloqueoCaja(producto.id));
      } catch (err) {
        setError(getErrorMessage(err, "No se pudo agregar el producto"));
      }
    });
  }

  function handleQuitar(id: string) {
    setError(null);
    startTransitionLista(async () => {
      try {
        throwIfActionError(await quitarProductoBloqueoCaja(id));
      } catch (err) {
        setError(getErrorMessage(err, "No se pudo quitar el producto"));
      }
    });
  }

  const yaElegido = (productoId: string) => productos.some((p) => p.producto.id === productoId);
  const lleno = productos.length >= BLOQUEO_CAJA_MAX_PRODUCTOS;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Checkbox
          id="bloqueo-caja-activo"
          checked={activo}
          onCheckedChange={(checked) => handleActivoChange(checked === true)}
          disabled={isPendingActivo}
        />
        <Label htmlFor="bloqueo-caja-activo">Bloqueo de caja activado</Label>
      </div>
      <p className="max-w-xl text-sm text-muted-foreground">
        Con el bloqueo activado, el cajero tiene que contar el stock de los productos elegidos
        acá abajo antes de poder cerrar su turno -- un control sorpresivo. Podés ir cambiando la
        lista en cualquier momento.
      </p>

      <div className="flex flex-col gap-2">
        <Label>Productos elegidos ({productos.length}/{BLOQUEO_CAJA_MAX_PRODUCTOS})</Label>
        {productos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no elegiste ningún producto.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {productos.map(({ fila, producto }) => (
              <li
                key={fila.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                {producto.nombre}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={isPendingLista}
                  onClick={() => handleQuitar(fila.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="max-w-sm">
        <Label className="mb-2 block">Agregar producto</Label>
        {lleno ? (
          <p className="text-sm text-muted-foreground">
            Ya elegiste {BLOQUEO_CAJA_MAX_PRODUCTOS} productos -- quitá uno para agregar otro.
          </p>
        ) : (
          <ScannerInput
            onSeleccionar={(p) => (yaElegido(p.id) ? undefined : handleAgregar(p))}
            disabled={isPendingLista}
          />
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
