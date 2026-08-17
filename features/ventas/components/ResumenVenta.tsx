"use client";

import type { useResumenVenta } from "@/features/ventas/hooks/useResumenVenta";
import { formatearMoneda } from "@/lib/format";

export function ResumenVenta({
  resumen,
}: {
  resumen: ReturnType<typeof useResumenVenta>;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-4 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span>{formatearMoneda(resumen.subtotal)}</span>
      </div>
      {resumen.ofertasAplicadas.map((o) => (
        <div key={o.oferta.id} className="flex justify-between text-muted-foreground">
          <span>
            Combo: {o.oferta.nombre} x{o.vecesAplicada}
          </span>
          <span>-{formatearMoneda(o.montoBeneficio)}</span>
        </div>
      ))}
      {resumen.descuentosAplicados.map((d) => (
        <div key={d.descuento.id} className="flex justify-between text-muted-foreground">
          <span>Descuento: {d.descuento.nombre}</span>
          <span>-{formatearMoneda(d.montoAplicado)}</span>
        </div>
      ))}
      {resumen.descuentosSuprimidosPorOferta && (
        <p className="text-xs text-muted-foreground">
          Esta venta tiene una oferta aplicada, por eso no se suma ningún descuento.
        </p>
      )}
      <div className="mt-1 flex justify-between border-t pt-1 text-base font-semibold">
        <span>Total</span>
        <span>{formatearMoneda(resumen.total)}</span>
      </div>
    </div>
  );
}
