"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RenglonCarritoUI } from "@/features/ventas/hooks/useCarrito";

export function Carrito({
  renglones,
  onCantidadChange,
  onQuitar,
}: {
  renglones: RenglonCarritoUI[];
  onCantidadChange: (productoId: string, cantidad: number) => void;
  onQuitar: (productoId: string) => void;
}) {
  if (renglones.length === 0) {
    return <p className="text-sm text-muted-foreground">El carrito está vacío.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Producto</TableHead>
          <TableHead>Cantidad</TableHead>
          <TableHead>Precio</TableHead>
          <TableHead>Subtotal</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {renglones.map((r, index) => (
          <TableRow key={`${r.producto.id}-${index}`}>
            <TableCell>{r.producto.nombre}</TableCell>
            <TableCell>
              {r.producto.tipo_venta === "peso" ? (
                `${r.cantidad} kg`
              ) : (
                <Input
                  type="number"
                  min="1"
                  step="1"
                  className="h-8 w-20"
                  value={r.cantidad}
                  onChange={(e) => onCantidadChange(r.producto.id, Number(e.target.value))}
                />
              )}
            </TableCell>
            <TableCell>
              ${r.producto.precio}
              {r.producto.tipo_venta === "peso" ? "/kg" : ""}
            </TableCell>
            <TableCell>${(r.cantidad * r.producto.precio).toFixed(2)}</TableCell>
            <TableCell>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onQuitar(r.producto.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
