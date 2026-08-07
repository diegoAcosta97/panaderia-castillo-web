"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResumenVenta } from "@/features/ventas/components/ResumenVenta";
import { useCobro } from "@/features/ventas/hooks/useCobro";
import type { RenglonCarritoUI } from "@/features/ventas/hooks/useCarrito";
import type { useResumenVenta } from "@/features/ventas/hooks/useResumenVenta";
import type { MedioPago } from "@/types/database";

type FormaPago = "efectivo" | "mercado_pago" | "combinado";

// E7-6: el flujo de Mercado Pago en sí (QR, espera de confirmación) llega en EPIC 8 — acá se
// arma la mecánica de reparto entre medios (con la suma exacta garantizada, nunca calculada a
// mano por el cajero) y se deja el punto de integración: mientras la porción de Mercado Pago
// sea > 0, "Confirmar venta" queda deshabilitado con el motivo a la vista.
export function PantallaCobro({
  cajaTurnoId,
  renglones,
  resumen,
  onCancelar,
  onConfirmada,
}: {
  cajaTurnoId: string;
  renglones: RenglonCarritoUI[];
  resumen: ReturnType<typeof useResumenVenta>;
  onCancelar: () => void;
  onConfirmada: (numeroComprobante: number) => void;
}) {
  const [formaPago, setFormaPago] = useState<FormaPago>("efectivo");
  const [montoEfectivo, setMontoEfectivo] = useState(resumen.total.toFixed(2));
  const { cobrar, error, isLoading } = useCobro();

  const total = resumen.total;
  const efectivo =
    formaPago === "efectivo" ? total : formaPago === "combinado" ? Number(montoEfectivo) || 0 : 0;
  const mercadoPago = Math.round((total - efectivo) * 100) / 100;
  const habilitado = formaPago === "efectivo" || (formaPago === "combinado" && mercadoPago === 0);

  async function handleConfirmar() {
    const mediosPago: { medio_pago: MedioPago; monto: number }[] = [];
    if (efectivo > 0) mediosPago.push({ medio_pago: "efectivo", monto: efectivo });
    if (mercadoPago > 0) mediosPago.push({ medio_pago: "mercado_pago", monto: mercadoPago });

    const resultado = await cobrar({ cajaTurnoId, renglones, resumen, mediosPago });
    if (resultado) onConfirmada(resultado.numero_comprobante);
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Cobrar</h1>
      <ResumenVenta resumen={resumen} />

      <div className="flex gap-2">
        <Button
          type="button"
          variant={formaPago === "efectivo" ? "default" : "outline"}
          onClick={() => setFormaPago("efectivo")}
        >
          Efectivo
        </Button>
        <Button
          type="button"
          variant={formaPago === "mercado_pago" ? "default" : "outline"}
          onClick={() => setFormaPago("mercado_pago")}
        >
          Mercado Pago
        </Button>
        <Button
          type="button"
          variant={formaPago === "combinado" ? "default" : "outline"}
          onClick={() => setFormaPago("combinado")}
        >
          Combinado
        </Button>
      </div>

      {formaPago === "mercado_pago" && (
        <p className="text-sm text-muted-foreground">
          Mercado Pago se integra en EPIC 8 — todavía no está disponible para cobrar.
        </p>
      )}

      {formaPago === "combinado" && (
        <div className="flex max-w-sm flex-col gap-2">
          <div className="grid gap-2">
            <Label htmlFor="monto-efectivo">Efectivo</Label>
            <Input
              id="monto-efectivo"
              type="number"
              min="0"
              max={total}
              step="0.01"
              value={montoEfectivo}
              onChange={(e) => setMontoEfectivo(e.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Mercado Pago: ${mercadoPago.toFixed(2)}
            {mercadoPago > 0 && " (todavía no disponible, EPIC 8)"}
          </p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancelar} disabled={isLoading}>
          Volver al carrito
        </Button>
        <Button type="button" onClick={handleConfirmar} disabled={!habilitado || isLoading}>
          {isLoading ? "Confirmando..." : `Confirmar venta ($${total.toFixed(2)})`}
        </Button>
      </div>
    </div>
  );
}
