"use client";

import { useState } from "react";
import { Banknote, QrCode, Split, ArrowLeft, CircleCheck, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResumenVenta } from "@/features/ventas/components/ResumenVenta";
import { EsperandoPagoMP } from "@/features/ventas/components/EsperandoPagoMP";
import { useCobro } from "@/features/ventas/hooks/useCobro";
import { useResumenVenta } from "@/features/ventas/hooks/useResumenVenta";
import { generarQrParaVenta, cancelarPagoMPPendiente } from "@/features/mercadopago/actions";
import { marcarPedidoEntregado } from "@/repositories/pedidosEncargoRepository";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import { throwIfActionError } from "@/lib/actionResult";
import { formatearMoneda } from "@/lib/format";
import type { RenglonCarritoUI } from "@/features/ventas/hooks/useCarrito";
import type { OfertaConItems } from "@/repositories/ofertasRepository";
import type { DescuentoConCondiciones } from "@/repositories/descuentosRepository";
import type { MedioPago } from "@/types/database";

type FormaPago = "efectivo" | "mercado_pago" | "combinado" | "tarjeta_debito" | "tarjeta_credito";

// E6-7: un descuento con condición 'medio_pago' solo puede evaluarse acá, una vez elegido el
// medio -- "combinado" no mapea a un único MedioPago (se reparte entre efectivo y Mercado Pago),
// así que ese tipo de descuento no aplica si se paga combinado.
const MEDIO_PAGO_POR_FORMA: Partial<Record<FormaPago, MedioPago>> = {
  efectivo: "efectivo",
  mercado_pago: "mercado_pago",
  tarjeta_debito: "tarjeta_debito",
  tarjeta_credito: "tarjeta_credito",
};

// RF acordado con el dueño: el recargo nunca es un ítem aparte -- confirmar_venta lo aplica como
// factor a todo lo que compone el total (renglones, ofertas, descuentos), así el comprobante
// nunca muestra una línea de "recargo" separada. Estos porcentajes tienen que coincidir con los
// hardcodeados en la migración 20260817090005_confirmar_venta_recargo_tarjeta.sql -- si cambian
// acá, cambian ahí también.
const RECARGO_TARJETA: Partial<Record<FormaPago, number>> = {
  tarjeta_debito: 0.05,
  tarjeta_credito: 0.15,
};

export function PantallaCobro({
  cajaTurnoId,
  renglones,
  ofertas,
  descuentos,
  pedidoActivo,
  onCancelar,
  onConfirmada,
}: {
  cajaTurnoId: string;
  renglones: RenglonCarritoUI[];
  ofertas: OfertaConItems[];
  descuentos: DescuentoConCondiciones[];
  pedidoActivo?: { id: string; clienteNombre: string; senaTotal: number } | null;
  onCancelar: () => void;
  onConfirmada: (ventaId: string, numeroComprobante: number) => void;
}) {
  const [formaPago, setFormaPago] = useState<FormaPago>("efectivo");
  // Se recalcula acá (no en PantallaVenta) porque un descuento con condición 'medio_pago' (E6-7)
  // solo se puede evaluar una vez elegido el medio de pago.
  const resumen = useResumenVenta(renglones, ofertas, descuentos, MEDIO_PAGO_POR_FORMA[formaPago]);

  // Si viene de un pedido por encargo con seña, esa plata ya entró en un turno anterior -- lo
  // que efectivo/Mercado Pago tienen que cubrir ahora es el saldo, no el total del pedido.
  const senaTotal = pedidoActivo?.senaTotal ?? 0;
  const totalACobrar = Math.max(0, resumen.total - senaTotal);

  const [montoEfectivo, setMontoEfectivo] = useState(totalACobrar.toFixed(2));
  const [montoEntregado, setMontoEntregado] = useState("");
  const [esperandoPago, setEsperandoPago] = useState<{ ventaId: string } | null>(null);
  const [errorQr, setErrorQr] = useState<string | null>(null);
  const [generandoQr, setGenerandoQr] = useState(false);
  const { cobrar, error, isLoading } = useCobro();

  const total = totalACobrar;
  const esTarjeta = formaPago === "tarjeta_debito" || formaPago === "tarjeta_credito";
  const recargoPct = RECARGO_TARJETA[formaPago] ?? 0;
  const totalConRecargo = Math.round(total * (1 + recargoPct) * 100) / 100;
  const efectivo =
    formaPago === "efectivo" ? total : formaPago === "combinado" ? Number(montoEfectivo) || 0 : 0;
  const mercadoPago = esTarjeta ? 0 : Math.round((total - efectivo) * 100) / 100;
  const habilitado = esTarjeta ? total > 0 : efectivo > 0 || mercadoPago > 0 || total <= 0;
  const entregado = Number(montoEntregado) || 0;
  const vuelto = Math.round((entregado - efectivo) * 100) / 100;

  async function handleConfirmar() {
    setErrorQr(null);
    const mediosPago: { medio_pago: MedioPago; monto: number }[] = [];
    if (esTarjeta) {
      mediosPago.push({ medio_pago: formaPago, monto: totalConRecargo });
    } else {
      if (senaTotal > 0) mediosPago.push({ medio_pago: "sena_pedido", monto: senaTotal });
      if (efectivo > 0) mediosPago.push({ medio_pago: "efectivo", monto: efectivo });
      if (mercadoPago > 0) mediosPago.push({ medio_pago: "mercado_pago", monto: mercadoPago });
    }

    const resultado = await cobrar({ cajaTurnoId, renglones, resumen, mediosPago });
    if (!resultado) return;

    if (pedidoActivo) {
      // No bloquea la confirmación de la venta si esto falla -- ya se cobró y se descontó
      // stock, un pedido que quedó "pendiente" con una venta ya hecha es reconciliable a mano.
      marcarPedidoEntregado(createClient(), pedidoActivo.id, resultado.venta_id).catch((err) =>
        console.error("No se pudo marcar el pedido como entregado:", err),
      );
    }

    if (resultado.estado === "completada") {
      onConfirmada(resultado.venta_id, resultado.numero_comprobante);
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
      throwIfActionError(await generarQrParaVenta(resultado.venta_id));
      setEsperandoPago({ ventaId: resultado.venta_id });
    } catch (err) {
      setErrorQr(getErrorMessage(err, "No se pudo generar el cobro de Mercado Pago"));
      try {
        throwIfActionError(await cancelarPagoMPPendiente(resultado.venta_id));
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
      {senaTotal > 0 && (
        <p className="flex justify-between text-sm text-muted-foreground">
          <span>Seña ya pagada ({pedidoActivo?.clienteNombre})</span>
          <span>-{formatearMoneda(senaTotal)}</span>
        </p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant={formaPago === "efectivo" ? "default" : "outline"}
          onClick={() => setFormaPago("efectivo")}
        >
          <Banknote className="size-4" />
          Efectivo
        </Button>
        <Button
          type="button"
          variant={formaPago === "mercado_pago" ? "default" : "outline"}
          onClick={() => setFormaPago("mercado_pago")}
        >
          <QrCode className="size-4" />
          Mercado Pago
        </Button>
        <Button
          type="button"
          variant={formaPago === "combinado" ? "default" : "outline"}
          onClick={() => setFormaPago("combinado")}
        >
          <Split className="size-4" />
          Combinado
        </Button>
        <Button
          type="button"
          variant={formaPago === "tarjeta_debito" ? "default" : "outline"}
          onClick={() => setFormaPago("tarjeta_debito")}
          disabled={senaTotal > 0}
        >
          <CreditCard className="size-4" />
          Débito
        </Button>
        <Button
          type="button"
          variant={formaPago === "tarjeta_credito" ? "default" : "outline"}
          onClick={() => setFormaPago("tarjeta_credito")}
          disabled={senaTotal > 0}
        >
          <CreditCard className="size-4" />
          Crédito
        </Button>
      </div>

      {senaTotal > 0 && (
        <p className="text-sm text-muted-foreground">
          El pago con tarjeta no está disponible para pedidos con una seña ya pagada.
        </p>
      )}

      {esTarjeta && (
        <p className="text-sm text-muted-foreground">
          Recargo del {Math.round(recargoPct * 100)}% incluido: total con tarjeta{" "}
          <span className="font-medium text-foreground">{formatearMoneda(totalConRecargo)}</span>.
          No se puede combinar con otro medio de pago.
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
            Mercado Pago: {formatearMoneda(mercadoPago)}
          </p>
        </div>
      )}

      {mercadoPago > 0 && (
        <p className="text-sm text-muted-foreground">
          Se va a cobrar {formatearMoneda(mercadoPago)} por el QR fijo de la caja: decile al
          cliente que lo escanee con la app de Mercado Pago.
        </p>
      )}

      {efectivo > 0 && (
        <div className="flex max-w-sm flex-col gap-2">
          <Label htmlFor="monto-entregado">Con cuánto paga (efectivo)</Label>
          <Input
            id="monto-entregado"
            type="number"
            min="0"
            step="0.01"
            value={montoEntregado}
            onChange={(e) => setMontoEntregado(e.target.value)}
          />
          {montoEntregado !== "" && (
            <p className={vuelto < 0 ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
              {vuelto < 0 ? `Falta ${formatearMoneda(-vuelto)}` : `Vuelto: ${formatearMoneda(vuelto)}`}
            </p>
          )}
        </div>
      )}

      {(error || errorQr) && <p className="text-sm text-destructive">{error || errorQr}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancelar} disabled={isLoading}>
          <ArrowLeft className="size-4" />
          Volver al carrito
        </Button>
        <Button
          type="button"
          onClick={handleConfirmar}
          disabled={!habilitado || isLoading || generandoQr}
        >
          <CircleCheck className="size-4" />
          {isLoading || generandoQr
            ? "Confirmando..."
            : `Confirmar venta (${formatearMoneda(esTarjeta ? totalConRecargo : total)})`}
        </Button>
      </div>
    </div>
  );
}
