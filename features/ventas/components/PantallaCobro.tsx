"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResumenVenta } from "@/features/ventas/components/ResumenVenta";
import { EsperandoPagoMP } from "@/features/ventas/components/EsperandoPagoMP";
import { useCobro } from "@/features/ventas/hooks/useCobro";
import { generarQrParaVenta, cancelarPagoMPPendiente } from "@/features/mercadopago/actions";
import { getErrorMessage } from "@/lib/errors";
import type { RenglonCarritoUI } from "@/features/ventas/hooks/useCarrito";
import type { useResumenVenta } from "@/features/ventas/hooks/useResumenVenta";
import type { MedioPago } from "@/types/database";

type FormaPago = "efectivo" | "mercado_pago" | "combinado";

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
  const [esperandoPago, setEsperandoPago] = useState<{ ventaId: string } | null>(null);
  const [errorQr, setErrorQr] = useState<string | null>(null);
  const [generandoQr, setGenerandoQr] = useState(false);
  const { cobrar, error, isLoading } = useCobro();

  const total = resumen.total;
  const efectivo =
    formaPago === "efectivo" ? total : formaPago === "combinado" ? Number(montoEfectivo) || 0 : 0;
  const mercadoPago = Math.round((total - efectivo) * 100) / 100;
  const habilitado = efectivo > 0 || mercadoPago > 0;

  async function handleConfirmar() {
    setErrorQr(null);
    const mediosPago: { medio_pago: MedioPago; monto: number }[] = [];
    if (efectivo > 0) mediosPago.push({ medio_pago: "efectivo", monto: efectivo });
    if (mercadoPago > 0) mediosPago.push({ medio_pago: "mercado_pago", monto: mercadoPago });

    const resultado = await cobrar({ cajaTurnoId, renglones, resumen, mediosPago });
    if (!resultado) return;

    if (resultado.estado === "completada") {
      onConfirmada(resultado.numero_comprobante);
      return;
    }

    // pendiente_pago: hay una porción en Mercado Pago, hace falta asociar el monto al QR
    // estático de la caja (E8-2). confirmar_venta ya insertó la venta (y su venta_medios_pago
    // 'pendiente') antes de llegar acá -- si esto falla (el chequeo de un cobro ya en curso,
    // Mercado Pago caído, lo que sea), esa venta queda huérfana y sin cancelar bloquearía
    // cualquier cobro con Mercado Pago siguiente para siempre (ella misma cuenta como "cobro
    // pendiente"). Por eso el catch cancela la venta que se acaba de crear antes de mostrar el
    // error -- reintentar después queda limpio.
    setGenerandoQr(true);
    try {
      await generarQrParaVenta(resultado.venta_id);
      setEsperandoPago({ ventaId: resultado.venta_id });
    } catch (err) {
      setErrorQr(getErrorMessage(err, "No se pudo generar el cobro de Mercado Pago"));
      try {
        await cancelarPagoMPPendiente(resultado.venta_id);
      } catch (cancelErr) {
        console.error("No se pudo limpiar la venta pendiente tras el error de Mercado Pago:", cancelErr);
      }
    } finally {
      setGenerandoQr(false);
    }
  }

  if (esperandoPago) {
    return (
      <EsperandoPagoMP
        ventaId={esperandoPago.ventaId}
        onConfirmada={onConfirmada}
        onCancelar={() => setEsperandoPago(null)}
      />
    );
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
          <p className="text-sm text-muted-foreground">Mercado Pago: ${mercadoPago.toFixed(2)}</p>
        </div>
      )}

      {mercadoPago > 0 && (
        <p className="text-sm text-muted-foreground">
          Se va a cobrar ${mercadoPago.toFixed(2)} por el QR fijo de la caja: decile al cliente
          que lo escanee con la app de Mercado Pago.
        </p>
      )}

      {(error || errorQr) && <p className="text-sm text-destructive">{error || errorQr}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancelar} disabled={isLoading}>
          Volver al carrito
        </Button>
        <Button
          type="button"
          onClick={handleConfirmar}
          disabled={!habilitado || isLoading || generandoQr}
        >
          {isLoading || generandoQr
            ? "Confirmando..."
            : `Confirmar venta ($${total.toFixed(2)})`}
        </Button>
      </div>
    </div>
  );
}
