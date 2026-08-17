"use client";

import { useState } from "react";
import type { Producto } from "@/repositories/productosRepository";

export interface RenglonCarritoUI {
  producto: Producto;
  cantidad: number;
}

export function useCarrito() {
  const [renglones, setRenglones] = useState<RenglonCarritoUI[]>([]);

  function agregarProducto(producto: Producto, cantidad: number = 1) {
    setRenglones((prev) => {
      // Los productos "por peso" no se acumulan (cada pesada es su propio renglón, tiene más
      // sentido para el cajero verlas separadas); los "por unidad" sí se suman al mismo renglón.
      if (producto.tipo_venta === "unidad") {
        const existente = prev.find((r) => r.producto.id === producto.id);
        if (existente) {
          return prev.map((r) =>
            r.producto.id === producto.id ? { ...r, cantidad: r.cantidad + cantidad } : r,
          );
        }
      }
      return [...prev, { producto, cantidad }];
    });
  }

  // Por índice, no por producto_id: los renglones "por peso" no se acumulan (cada pesada es su
  // propia fila, ver agregarProducto), así que puede haber más de un renglón con el mismo
  // producto_id -- editar/quitar por id tocaría todas esas filas a la vez en vez de una sola.
  function actualizarCantidad(index: number, cantidad: number) {
    setRenglones((prev) =>
      cantidad <= 0
        ? prev.filter((_, i) => i !== index)
        : prev.map((r, i) => (i === index ? { ...r, cantidad } : r)),
    );
  }

  function quitarRenglon(index: number) {
    setRenglones((prev) => prev.filter((_, i) => i !== index));
  }

  function vaciar() {
    setRenglones([]);
  }

  return { renglones, agregarProducto, actualizarCantidad, quitarRenglon, vaciar };
}
