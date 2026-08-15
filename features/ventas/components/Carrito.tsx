"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
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
import { formatearMoneda } from "@/lib/format";

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
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={r.cantidad <= 1}
                    onClick={() => onCantidadChange(r.producto.id, r.cantidad - 1)}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    className="h-8 w-16 text-center"
                    value={r.cantidad}
                    onChange={(e) => onCantidadChange(r.producto.id, Number(e.target.value))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => onCantidadChange(r.producto.id, r.cantidad + 1)}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              )}
            </TableCell>
            <TableCell>
              {formatearMoneda(r.producto.precio)}
              {r.producto.tipo_venta === "peso" ? "/kg" : ""}
            </TableCell>
            <TableCell>{formatearMoneda(r.cantidad * r.producto.precio)}</TableCell>
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
