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

  function actualizarCantidad(productoId: string, cantidad: number) {
    setRenglones((prev) =>
      cantidad <= 0
        ? prev.filter((r) => r.producto.id !== productoId)
        : prev.map((r) => (r.producto.id === productoId ? { ...r, cantidad } : r)),
    );
  }

  function quitarRenglon(productoId: string) {
    setRenglones((prev) => prev.filter((r) => r.producto.id !== productoId));
  }

  function vaciar() {
    setRenglones([]);
  }

  return { renglones, agregarProducto, actualizarCantidad, quitarRenglon, vaciar };
}
