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
import { OfertaDialog } from "@/features/ofertas/components/OfertaDialog";
import { actualizarOfertaActivo } from "@/features/ofertas/actions";
import type { Producto } from "@/repositories/productosRepository";
import type { OfertaConItems } from "@/repositories/ofertasRepository";

const ETIQUETA_BENEFICIO = {
  precio_fijo: "Precio fijo",
  descuento_porcentaje: "% descuento",
  descuento_monto: "Monto fijo",
};

export function OfertasTable({
  ofertas,
  productos,
}: {
  ofertas: OfertaConItems[];
  productos: Producto[];
}) {
  const nombreProducto = (id: string) => productos.find((p) => p.id === id)?.nombre ?? "—";

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Combo</TableHead>
          <TableHead>Beneficio</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Máx./venta</TableHead>
          <TableHead>Activa</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ofertas.map((oferta) => (
          <OfertaRow
            key={oferta.id}
            oferta={oferta}
            productos={productos}
            nombreProducto={nombreProducto}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function OfertaRow({
  oferta,
  productos,
  nombreProducto,
}: {
  oferta: OfertaConItems;
  productos: Producto[];
  nombreProducto: (id: string) => string;
}) {
  const [isPending, startTransition] = useTransition();
  const [activo, setActivo] = useState(oferta.activo);

  function handleActivoChange(nuevoActivo: boolean) {
    setActivo(nuevoActivo);
    startTransition(() => actualizarOfertaActivo(oferta.id, nuevoActivo));
  }

  return (
    <TableRow className={isPending ? "opacity-60" : undefined}>
      <TableCell>{oferta.nombre}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {oferta.items.map((i) => `${i.cantidad_requerida} ${nombreProducto(i.producto_id)}`).join(" + ")}
      </TableCell>
      <TableCell>{ETIQUETA_BENEFICIO[oferta.tipo_beneficio]}</TableCell>
      <TableCell>{oferta.valor_beneficio}</TableCell>
      <TableCell>{oferta.max_aplicaciones_por_venta ?? "sin límite"}</TableCell>
      <TableCell>
        <Checkbox
          checked={activo}
          onCheckedChange={(checked) => handleActivoChange(checked === true)}
        />
      </TableCell>
      <TableCell>
        <OfertaDialog productos={productos} oferta={oferta} />
      </TableCell>
    </TableRow>
  );
}
