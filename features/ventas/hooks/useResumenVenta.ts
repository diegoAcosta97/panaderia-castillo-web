"use client";

import { useMemo } from "react";
import { evaluarBeneficios } from "@/services/beneficiosService";
import type { RenglonCarritoUI } from "@/features/ventas/hooks/useCarrito";
import type { OfertaConItems } from "@/repositories/ofertasRepository";
import type { DescuentoConCondiciones } from "@/repositories/descuentosRepository";
import type { MedioPago } from "@/types/database";

// E7-5: recalcula en cada cambio del carrito. useMemo evita rehacer el trabajo del motor de
// evaluación (E6-5) en cada render si el carrito no cambió. `medioPago` es opcional porque en el
// carrito todavía no se eligió (PantallaVenta llama sin ese argumento) -- solo PantallaCobro, una
// vez elegido, lo pasa para que una condición 'medio_pago' (E6-7) pueda evaluarse.
export function useResumenVenta(
  renglones: RenglonCarritoUI[],
  ofertas: OfertaConItems[],
  descuentos: DescuentoConCondiciones[],
  medioPago?: MedioPago,
) {
  return useMemo(() => {
    const productos = renglones.map((r) => r.producto);
    const renglonesCarrito = renglones.map((r) => ({
      productoId: r.producto.id,
      cantidad: r.cantidad,
    }));
    // precioUnitario, no producto.precio: puede diferir del catálogo cuando la línea se cargó/
    // editó "por monto" (ver useCarrito.RenglonCarritoUI). Las ofertas/descuentos siguen
    // evaluándose sobre precio de catálogo (evaluarBeneficios usa `productos`, no este subtotal).
    const subtotal = renglones.reduce((acc, r) => acc + r.cantidad * r.precioUnitario, 0);
    const resultado = evaluarBeneficios(
      renglonesCarrito,
      productos,
      ofertas,
      descuentos,
      new Date(),
      medioPago,
    );
    const total = subtotal - resultado.totalOfertas - resultado.totalDescuentos;

    return { subtotal, total, ...resultado };
  }, [renglones, ofertas, descuentos, medioPago]);
}
