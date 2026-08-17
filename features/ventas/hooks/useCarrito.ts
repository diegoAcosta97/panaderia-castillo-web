"use client";

import { useState } from "react";
import type { Producto } from "@/repositories/productosRepository";

export interface RenglonCarritoUI {
  producto: Producto;
  cantidad: number;
  // Precio real de esta línea. Normalmente == producto.precio; difiere solo cuando un producto
  // "por peso" se cargó (o se editó) "por monto" -- el peso se redondea al gramo para poder
  // guardarse, así que el precio de esa pesada puntual se ajusta un poco para que
  // cantidad * precioUnitario dé exactamente el monto que tipeó el cajero, en vez de perder unos
  // pesos por el redondeo del peso (confirmar_venta valida que el ajuste sea mínimo).
  precioUnitario: number;
}

export function useCarrito() {
  const [renglones, setRenglones] = useState<RenglonCarritoUI[]>([]);

  function agregarProducto(producto: Producto, cantidad: number = 1, precioUnitario?: number) {
    setRenglones((prev) => {
      // Los productos "por peso" no se acumulan (cada pesada es su propio renglón, tiene más
      // sentido para el cajero verlas separadas); los "por unidad" sí se suman al mismo renglón.
      // Un "por unidad" nunca lleva precioUnitario propio (ver nota de tipo), así que sumar
      // cantidades ahí siempre es seguro.
      if (producto.tipo_venta === "unidad") {
        const existente = prev.find((r) => r.producto.id === producto.id);
        if (existente) {
          return prev.map((r) =>
            r.producto.id === producto.id ? { ...r, cantidad: r.cantidad + cantidad } : r,
          );
        }
      }
      return [...prev, { producto, cantidad, precioUnitario: precioUnitario ?? producto.precio }];
    });
  }

  // Por índice, no por producto_id: los renglones "por peso" no se acumulan (cada pesada es su
  // propia fila, ver agregarProducto), así que puede haber más de un renglón con el mismo
  // producto_id -- editar/quitar por id tocaría todas esas filas a la vez en vez de una sola.
  //
  // Editar la cantidad directamente (a diferencia de editar el subtotal, ver actualizarSubtotal)
  // vuelve al precio de catálogo: el cajero está pidiendo explícitamente "este peso", no "que me
  // dé para este monto", así que no corresponde mantener ningún ajuste de precio anterior.
  function actualizarCantidad(index: number, cantidad: number) {
    setRenglones((prev) =>
      cantidad <= 0
        ? prev.filter((_, i) => i !== index)
        : prev.map((r, i) => (i === index ? { ...r, cantidad, precioUnitario: r.producto.precio } : r)),
    );
  }

  // Cargar/editar "por monto": cantidad ya viene redondeada (grs) y precioUnitario ajustado para
  // que cantidad * precioUnitario dé exactamente el monto pedido.
  function actualizarCantidadYPrecio(index: number, cantidad: number, precioUnitario: number) {
    setRenglones((prev) =>
      cantidad <= 0
        ? prev.filter((_, i) => i !== index)
        : prev.map((r, i) => (i === index ? { ...r, cantidad, precioUnitario } : r)),
    );
  }

  function quitarRenglon(index: number) {
    setRenglones((prev) => prev.filter((_, i) => i !== index));
  }

  function vaciar() {
    setRenglones([]);
  }

  return {
    renglones,
    agregarProducto,
    actualizarCantidad,
    actualizarCantidadYPrecio,
    quitarRenglon,
    vaciar,
  };
}
