"use client";

import { useMemo } from "react";
import { evaluarBeneficios } from "@/services/beneficiosService";
import type { RenglonCarritoUI } from "@/features/ventas/hooks/useCarrito";
import type { OfertaConItems } from "@/repositories/ofertasRepository";
import type { DescuentoConCondiciones } from "@/repositories/descuentosRepository";

// E7-5: recalcula en cada cambio del carrito. useMemo evita rehacer el trabajo del motor de
// evaluación (E6-5) en cada render si el carrito no cambió.
export function useResumenVenta(
  renglones: RenglonCarritoUI[],
  ofertas: OfertaConItems[],
  descuentos: DescuentoConCondiciones[],
) {
  return useMemo(() => {
    const productos = renglones.map((r) => r.producto);
    const renglonesCarrito = renglones.map((r) => ({
      productoId: r.producto.id,
      cantidad: r.cantidad,
    }));
    const subtotal = renglones.reduce((acc, r) => acc + r.cantidad * r.producto.precio, 0);
    const resultado = evaluarBeneficios(renglonesCarrito, productos, ofertas, descuentos);
    const total = subtotal - resultado.totalOfertas - resultado.totalDescuentos;

    return { subtotal, total, ...resultado };
  }, [renglones, ofertas, descuentos]);
}
