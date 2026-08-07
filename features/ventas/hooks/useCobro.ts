"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { confirmarVenta, type ConfirmarVentaResultado } from "@/repositories/ventasRepository";
import { getErrorMessage } from "@/lib/errors";
import type { RenglonCarritoUI } from "@/features/ventas/hooks/useCarrito";
import type { useResumenVenta } from "@/features/ventas/hooks/useResumenVenta";
import type { MedioPago } from "@/types/database";

function mergeRenglones(renglones: RenglonCarritoUI[]) {
  const mapa = new Map<string, number>();
  for (const r of renglones) {
    mapa.set(r.producto.id, (mapa.get(r.producto.id) ?? 0) + r.cantidad);
  }
  return Array.from(mapa.entries()).map(([producto_id, cantidad]) => ({ producto_id, cantidad }));
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
