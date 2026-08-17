"use client";

import { useState } from "react";
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

// Redondeo acorde a la precisión real de cada tipo de venta: "unidad" no admite fracciones
// (stock_actual entero, RF-1.2), "peso" se guarda numeric(12,3) -- ver docs/data-model.md.
function cantidadDesdeSubtotal(subtotal: number, precio: number, tipoVenta: "unidad" | "peso") {
  if (precio <= 0) return 0;
  const cruda = subtotal / precio;
  return tipoVenta === "unidad" ? Math.round(cruda) : Math.round(cruda * 1000) / 1000;
}

// Confirma recién al salir del campo (blur/Enter), no en cada tecla -- cantidad y subtotal se
// recalculan uno del otro, así que confirmar por tecla haría que el campo se autoreformatee
// mientras se está escribiendo (ej. tipear "1500" en subtotal se ve interrumpido apenas el "1"
// redondea a una cantidad de 0). Mientras el campo tiene foco, el texto es 100% del usuario.
function useCampoNumerico(valor: number, formato: (n: number) => string, onCommit: (n: number) => void) {
  const [texto, setTexto] = useState(() => formato(valor));
  // Patrón "ajustar estado cuando cambia una prop" (docs de React): setState en el cuerpo del
  // render, guardado por la comparación, en vez de un useEffect -- evita el frame con el texto
  // viejo que un efecto dejaría ver antes de re-sincronizar.
  const [valorPrevio, setValorPrevio] = useState(valor);
  if (valor !== valorPrevio) {
    setValorPrevio(valor);
    setTexto(formato(valor));
  }

  function commit() {
    const parsed = Number(texto);
    if (Number.isFinite(parsed) && parsed > 0) {
      onCommit(parsed);
    } else {
      setTexto(formato(valor));
    }
  }

  return {
    value: texto,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setTexto(e.target.value),
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") e.currentTarget.blur();
    },
  };
}

const formatoCantidad = (n: number) => String(n);
const formatoMonto = (n: number) => n.toFixed(2);

function RenglonRow({
  renglon,
  onCantidadChange,
  onSubtotalChange,
  onQuitar,
}: {
  renglon: RenglonCarritoUI;
  onCantidadChange: (cantidad: number) => void;
  onSubtotalChange: (subtotal: number) => void;
  onQuitar: () => void;
}) {
  const esPeso = renglon.producto.tipo_venta === "peso";
  const subtotal = renglon.cantidad * renglon.producto.precio;

  // Redondeo también al tipear la cantidad directamente (no solo al derivarla del subtotal) --
  // un producto "por unidad" nunca debería terminar con una cantidad fraccionaria.
  const campoCantidad = useCampoNumerico(renglon.cantidad, formatoCantidad, (n) =>
    onCantidadChange(
      esPeso ? Math.max(0.001, Math.round(n * 1000) / 1000) : Math.max(1, Math.round(n)),
    ),
  );
  const campoSubtotal = useCampoNumerico(subtotal, formatoMonto, onSubtotalChange);

  return (
    <TableRow>
      <TableCell>{renglon.producto.nombre}</TableCell>
      <TableCell>
        {esPeso ? (
          <div className="flex items-center gap-1">
            <Input type="number" min="0.001" step="0.001" className="h-8 w-20 text-center" {...campoCantidad} />
            <span className="text-sm text-muted-foreground">kg</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={renglon.cantidad <= 1}
              onClick={() => onCantidadChange(renglon.cantidad - 1)}
            >
              <Minus className="size-4" />
            </Button>
            <Input type="number" min="1" step="1" className="h-8 w-16 text-center" {...campoCantidad} />
            <Button type="button" variant="outline" size="icon-sm" onClick={() => onCantidadChange(renglon.cantidad + 1)}>
              <Plus className="size-4" />
            </Button>
          </div>
        )}
      </TableCell>
      <TableCell>
        {formatearMoneda(renglon.producto.precio)}
        {esPeso ? "/kg" : ""}
      </TableCell>
      <TableCell>
        <Input type="number" min="0" step="0.01" className="h-8 w-24" {...campoSubtotal} />
      </TableCell>
      <TableCell>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onQuitar}>
          <Trash2 className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function Carrito({
  renglones,
  onCantidadChange,
  onQuitar,
}: {
  renglones: RenglonCarritoUI[];
  onCantidadChange: (index: number, cantidad: number) => void;
  onQuitar: (index: number) => void;
}) {
  if (renglones.length === 0) {
    return <p className="text-sm text-muted-foreground">El carrito está vacío.</p>;
  }

  function handleSubtotalChange(index: number, renglon: RenglonCarritoUI, subtotal: number) {
    const cantidad = cantidadDesdeSubtotal(subtotal, renglon.producto.precio, renglon.producto.tipo_venta);
    if (cantidad > 0) onCantidadChange(index, cantidad);
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
          <RenglonRow
            key={`${r.producto.id}-${index}`}
            renglon={r}
            onCantidadChange={(cantidad) => onCantidadChange(index, cantidad)}
            onSubtotalChange={(subtotal) => handleSubtotalChange(index, r, subtotal)}
            onQuitar={() => onQuitar(index)}
          />
        ))}
      </TableBody>
    </Table>
  );
}
