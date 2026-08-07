"use client";

import { useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DescuentoDialog } from "@/features/descuentos/components/DescuentoDialog";
import { actualizarDescuentoActivo } from "@/features/descuentos/actions";
import type { Producto } from "@/repositories/productosRepository";
import type { Categoria } from "@/repositories/categoriasRepository";
import type { DescuentoConCondiciones, DescuentoCondicion } from "@/repositories/descuentosRepository";

export function DescuentosTable({
  descuentos,
  productos,
  categorias,
}: {
  descuentos: DescuentoConCondiciones[];
  productos: Producto[];
  categorias: Categoria[];
}) {
  function describirCondicion(c: DescuentoCondicion): string {
    if (c.tipo_condicion === "monto_minimo") return `total ≥ $${c.monto_minimo}`;
    if (c.tipo_condicion === "producto_incluido") {
      const nombre = productos.find((p) => p.id === c.producto_id)?.nombre ?? "—";
      return `≥ ${c.cantidad_minima ?? 1} ${nombre}`;
    }
    const nombre = categorias.find((cat) => cat.id === c.categoria_id)?.nombre ?? "—";
    return `≥ ${c.cantidad_minima ?? 1} de "${nombre}"`;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Condiciones</TableHead>
          <TableHead>Efecto</TableHead>
          <TableHead>Activo</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {descuentos.map((descuento) => (
          <DescuentoRow
            key={descuento.id}
            descuento={descuento}
            productos={productos}
            categorias={categorias}
            describirCondicion={describirCondicion}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function DescuentoRow({
  descuento,
  productos,
  categorias,
  describirCondicion,
}: {
  descuento: DescuentoConCondiciones;
  productos: Producto[];
  categorias: Categoria[];
  describirCondicion: (c: DescuentoCondicion) => string;
}) {
  const [isPending, startTransition] = useTransition();
  const [activo, setActivo] = useState(descuento.activo);

  function handleActivoChange(nuevoActivo: boolean) {
    setActivo(nuevoActivo);
    startTransition(() => actualizarDescuentoActivo(descuento.id, nuevoActivo));
  }

  return (
    <TableRow className={isPending ? "opacity-60" : undefined}>
      <TableCell>{descuento.nombre}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {descuento.condiciones.map(describirCondicion).join(" Y ")}
      </TableCell>
      <TableCell>
        {descuento.tipo_efecto === "porcentaje"
          ? `${descuento.valor_efecto}%`
          : `$${descuento.valor_efecto}`}
      </TableCell>
      <TableCell>
        <Checkbox
          checked={activo}
          onCheckedChange={(checked) => handleActivoChange(checked === true)}
        />
      </TableCell>
      <TableCell>
        <DescuentoDialog productos={productos} categorias={categorias} descuento={descuento} />
      </TableCell>
    </TableRow>
  );
}
