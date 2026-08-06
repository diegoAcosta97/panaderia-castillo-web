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
import { ProductoDialog } from "@/features/productos/components/ProductoDialog";
import { actualizarProducto } from "@/features/productos/actions";
import type { Categoria } from "@/repositories/categoriasRepository";
import type { Producto } from "@/repositories/productosRepository";

export function ProductosTable({
  productos,
  categorias,
}: {
  productos: Producto[];
  categorias: Categoria[];
}) {
  const nombreCategoria = (id: string) => categorias.find((c) => c.id === id)?.nombre ?? "—";

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>Venta</TableHead>
          <TableHead>Precio</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>Activo</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {productos.map((producto) => (
          <ProductoRow
            key={producto.id}
            producto={producto}
            categorias={categorias}
            nombreCategoria={nombreCategoria(producto.categoria_id)}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function ProductoRow({
  producto,
  categorias,
  nombreCategoria,
}: {
  producto: Producto;
  categorias: Categoria[];
  nombreCategoria: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [activo, setActivo] = useState(producto.activo);

  function handleActivoChange(nuevoActivo: boolean) {
    setActivo(nuevoActivo);
    startTransition(() => actualizarProducto(producto.id, { activo: nuevoActivo }));
  }

  return (
    <TableRow className={isPending ? "opacity-60" : undefined}>
      <TableCell>{producto.nombre}</TableCell>
      <TableCell>{nombreCategoria}</TableCell>
      <TableCell>{producto.tipo_venta === "peso" ? "Peso (kg)" : "Unidad"}</TableCell>
      <TableCell>
        ${producto.precio.toFixed(2)}
        {producto.tipo_venta === "peso" ? "/kg" : ""}
      </TableCell>
      <TableCell>{producto.controla_stock ? producto.stock_actual : "sin control"}</TableCell>
      <TableCell>
        <Checkbox
          checked={activo}
          onCheckedChange={(checked) => handleActivoChange(checked === true)}
        />
      </TableCell>
      <TableCell>
        <ProductoDialog categorias={categorias} producto={producto} />
      </TableCell>
    </TableRow>
  );
}
