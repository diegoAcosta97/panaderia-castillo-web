"use client";

import type { useResumenVenta } from "@/features/ventas/hooks/useResumenVenta";

export function ResumenVenta({
  resumen,
}: {
  resumen: ReturnType<typeof useResumenVenta>;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-4 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span>${resumen.subtotal.toFixed(2)}</span>
      </div>
      {resumen.ofertasAplicadas.map((o) => (
        <div key={o.oferta.id} className="flex justify-between text-muted-foreground">
          <span>
            Combo: {o.oferta.nombre} x{o.vecesAplicada}
          </span>
          <span>-${o.montoBeneficio.toFixed(2)}</span>
        </div>
      ))}
      {resumen.descuentosAplicados.map((d) => (
        <div key={d.descuento.id} className="flex justify-between text-muted-foreground">
          <span>Descuento: {d.descuento.nombre}</span>
          <span>-${d.montoAplicado.toFixed(2)}</span>
        </div>
      ))}
      <div className="mt-1 flex justify-between border-t pt-1 text-base font-semibold">
        <span>Total</span>
        <span>${resumen.total.toFixed(2)}</span>
      </div>
    </div>
  );
}
