"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { confirmarVenta, type ConfirmarVentaResultado } from "@/repositories/ventasRepository";
import { getErrorMessage } from "@/lib/errors";
import type { RenglonCarritoUI } from "@/features/ventas/hooks/useCarrito";
import type { useResumenVenta } from "@/features/ventas/hooks/useResumenVenta";
import type { MedioPago } from "@/types/database";

// Agrupa por (producto_id, precio efectivo) -- no solo por producto_id -- para no mezclar en un
// mismo renglón una pesada a precio de catálogo con otra ajustada "por monto" (ver
// useCarrito.RenglonCarritoUI). `precio_unitario` solo se manda cuando difiere del catálogo: el
// caso común (sin ajuste) queda con la misma forma de siempre, así confirmar_venta sigue usando
// el precio real del producto sin depender de que el cliente lo repita bien.
function mergeRenglones(renglones: RenglonCarritoUI[]) {
  const mapa = new Map<
    string,
    { producto_id: string; cantidad: number; precio_unitario?: number }
  >();
  for (const r of renglones) {
    const tieneOverride = r.precioUnitario !== r.producto.precio;
    const clave = tieneOverride ? `${r.producto.id}:${r.precioUnitario}` : r.producto.id;
    const existente = mapa.get(clave);
    if (existente) {
      existente.cantidad += r.cantidad;
    } else {
      mapa.set(clave, {
        producto_id: r.producto.id,
        cantidad: r.cantidad,
        ...(tieneOverride ? { precio_unitario: r.precioUnitario } : {}),
      });
    }
  }
  return Array.from(mapa.values());
}

export function useCobro() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function cobrar(input: {
    cajaTurnoId: string;
    renglones: RenglonCarritoUI[];
    resumen: ReturnType<typeof useResumenVenta>;
    mediosPago: { medio_pago: MedioPago; monto: number }[];
  }): Promise<ConfirmarVentaResultado | null> {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      return await confirmarVenta(supabase, {
        cajaTurnoId: input.cajaTurnoId,
        renglones: mergeRenglones(input.renglones),
        ofertas: input.resumen.ofertasAplicadas.map((o) => ({
          oferta_id: o.oferta.id,
          veces_aplicada: o.vecesAplicada,
          monto_beneficio: o.montoBeneficio,
        })),
        descuentos: input.resumen.descuentosAplicados.map((d) => ({
          descuento_id: d.descuento.id,
          monto_aplicado: d.montoAplicado,
        })),
        mediosPago: input.mediosPago,
      });
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo confirmar la venta"));
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { cobrar, error, isLoading };
}
