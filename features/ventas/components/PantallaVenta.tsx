"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  CircleCheck,
  CreditCard,
  QrCode,
  ShoppingCart,
  Split,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScannerInput } from "@/features/ventas/components/ScannerInput";
import { PesoDialog } from "@/features/ventas/components/PesoDialog";
import { Carrito } from "@/features/ventas/components/Carrito";
import { ResumenVenta } from "@/features/ventas/components/ResumenVenta";
import { EsperandoPagoMP } from "@/features/ventas/components/EsperandoPagoMP";
import { useCarrito } from "@/features/ventas/hooks/useCarrito";
import { useResumenVenta } from "@/features/ventas/hooks/useResumenVenta";
import { useCobro } from "@/features/ventas/hooks/useCobro";
import { generarQrParaVenta, cancelarPagoMPPendiente } from "@/features/mercadopago/actions";
import { marcarPedidoEntregado } from "@/repositories/pedidosEncargoRepository";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import { throwIfActionError } from "@/lib/actionResult";
import { CargarPedidoDialog } from "@/features/pedidos-encargo/components/CargarPedidoDialog";
import type { PedidoCargado } from "@/features/pedidos-encargo/components/CargarPedidoDialog";
import type { Producto } from "@/repositories/productosRepository";
import type { OfertaConItems } from "@/repositories/ofertasRepository";
import type { DescuentoConCondiciones } from "@/repositories/descuentosRepository";
import type { MedioPago } from "@/types/database";
import { formatearMoneda } from "@/lib/format";

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

// Revisión de UI (2026-08-17): antes "armar carrito" y "cobrar" eran dos pantallas separadas
// (botón "Cobrar" cambiaba de paso). El pedido del dueño fue tenerlo todo junto en una sola
// pantalla dinámica -- carrito a la izquierda, resumen + forma de pago a la derecha, todo
// recalculando en vivo -- y reservar una pantalla aparte solo para lo que de verdad es un paso
// distinto: esperar el pago con Mercado Pago (polling contra otro sistema) y el comprobante para
// imprimir (ya es una pestaña nueva, /pos/comprobante/[id]).
export function PantallaVenta({
  cajaTurnoId,
  ofertas,
  descuentos,
}: {
  cajaTurnoId: string;
  ofertas: OfertaConItems[];
  descuentos: DescuentoConCondiciones[];
}) {
  const { renglones, agregarProducto, actualizarCantidad, actualizarCantidadYPrecio, quitarRenglon, vaciar } =
    useCarrito();
  const [productoPesoPendiente, setProductoPesoPendiente] = useState<Producto | null>(null);
  const [pedidoActivo, setPedidoActivo] = useState<{
    id: string;
    clienteNombre: string;
    senaTotal: number;
  } | null>(null);
  const [ultimaVenta, setUltimaVenta] = useState<{
    ventaId: string;
    numeroComprobante: number;
  } | null>(null);

  // Único indicio visual de que un escaneo/pesada "entró" al carrito: un cartel corto al lado
  // del scanner + un resalte momentáneo de la fila en Carrito (ver flashProductoId más abajo).
  const [ultimoAgregado, setUltimoAgregado] = useState<{
    key: number;
    productoId: string;
    nombre: string;
    cantidad: number;
    tipoVenta: Producto["tipo_venta"];
  } | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  function registrarAgregado(producto: Producto, cantidad: number) {
    setUltimoAgregado({
      key: Date.now(),
      productoId: producto.id,
      nombre: producto.nombre,
      cantidad,
      tipoVenta: producto.tipo_venta,
    });
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setUltimoAgregado(null), 1600);
  }

  const [formaPago, setFormaPago] = useState<FormaPago>("efectivo");
  // Se recalcula acá (no en un paso aparte) porque un descuento con condición 'medio_pago'
  // (E6-7) solo se puede evaluar una vez elegido el medio de pago -- y ahora el medio se puede
  // elegir en cualquier momento, mientras se sigue cargando el carrito.
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
  const habilitado =
    renglones.length > 0 && (esTarjeta ? total > 0 : efectivo > 0 || mercadoPago > 0 || total <= 0);
  const entregado = Number(montoEntregado) || 0;
  const vuelto = Math.round((entregado - efectivo) * 100) / 100;

  function handleCargarPedido(pedido: PedidoCargado) {
    vaciar();
    for (const item of pedido.items) agregarProducto(item.producto, item.cantidad);
    setPedidoActivo({
      id: pedido.pedidoId,
      clienteNombre: pedido.clienteNombre,
      senaTotal: pedido.senaTotal,
    });
  }

  function handleQuitarPedido() {
    vaciar();
    setPedidoActivo(null);
  }

  function handleSeleccionar(producto: Producto) {
    if (producto.tipo_venta === "peso") {
      setProductoPesoPendiente(producto);
    } else {
      agregarProducto(producto, 1);
      registrarAgregado(producto, 1);
    }
  }

  function confirmarPeso(peso: number, precioUnitario?: number) {
    if (productoPesoPendiente) {
      agregarProducto(productoPesoPendiente, peso, precioUnitario);
      registrarAgregado(productoPesoPendiente, peso);
      setProductoPesoPendiente(null);
    }
  }

  function handleSeleccionarFormaPago(forma: FormaPago) {
    setFormaPago(forma);
    if (forma === "combinado") setMontoEfectivo(total.toFixed(2));
  }

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
      setUltimaVenta({ ventaId: resultado.venta_id, numeroComprobante: resultado.numero_comprobante });
      vaciar();
      setPedidoActivo(null);
      setFormaPago("efectivo");
      setMontoEntregado("");
      return;
    }

    // pendiente_pago: hay una porción en Mercado Pago, hace falta asociar el monto al QR
    // estático de la caja (E8-2). Desde la migración 20260821090070 (pedido del dueño: "por el
    // momento" Mercado Pago se carga a mano en el POSNET y confirma al toque, como una tarjeta)
    // confirmar_venta ya no devuelve 'pendiente_pago' para 'mercado_pago', así que esta rama no
    // se dispara en la práctica -- queda el código para cuando se reactive el circuito de QR/
    // webhook (revertir esa migración). confirmar_venta ya insertó la venta (y su
    // venta_medios_pago 'pendiente') antes de llegar acá -- si esto falla (el chequeo de un
    // cobro ya en curso,
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

  function handleConfirmadaMP(ventaId: string, numeroComprobante: number) {
    setUltimaVenta({ ventaId, numeroComprobante });
    vaciar();
    setPedidoActivo(null);
    setFormaPago("efectivo");
    setMontoEntregado("");
    setEsperandoPago(null);
  }

  if (esperandoPago) {
    return (
      <EsperandoPagoMP
        ventaId={esperandoPago.ventaId}
        onConfirmada={handleConfirmadaMP}
        onCancelar={() => setEsperandoPago(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {ultimaVenta && (
          <p className="flex items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/10 p-3 text-sm">
            <span className="flex items-center gap-2">
              <CircleCheck className="size-4 text-success" />
              Venta confirmada — comprobante N.º {ultimaVenta.numeroComprobante}
            </span>
            <Link
              href={`/pos/comprobante/${ultimaVenta.ventaId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Ver / imprimir
            </Link>
          </p>
        )}

        {pedidoActivo && (
          <p className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <span>
              Pedido cargado: <span className="font-medium">{pedidoActivo.clienteNombre}</span>
              {pedidoActivo.senaTotal > 0 &&
                ` — seña ya pagada: ${formatearMoneda(pedidoActivo.senaTotal)}`}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={handleQuitarPedido}>
              Quitar
            </Button>
          </p>
        )}

        <div className="flex gap-2">
          <div className="flex-1">
            <ScannerInput onSeleccionar={handleSeleccionar} disabled={!!productoPesoPendiente} />
          </div>
          {!pedidoActivo && renglones.length === 0 && (
            <CargarPedidoDialog onCargar={handleCargarPedido} />
          )}
        </div>

        {ultimoAgregado && (
          <p
            key={ultimoAgregado.key}
            className="flex w-fit items-center gap-1.5 rounded-md bg-success/10 px-2.5 py-1 text-sm font-medium text-success animate-in fade-in slide-in-from-top-1"
          >
            <CircleCheck className="size-4" />
            Agregado: {ultimoAgregado.nombre}{" "}
            {ultimoAgregado.tipoVenta === "peso"
              ? `(${ultimoAgregado.cantidad} kg)`
              : `x${ultimoAgregado.cantidad}`}
          </p>
        )}

        <Carrito
          renglones={renglones}
          flashProductoId={ultimoAgregado?.productoId ?? null}
          onCantidadChange={actualizarCantidad}
          onCantidadYPrecioChange={actualizarCantidadYPrecio}
          onQuitar={quitarRenglon}
        />
      </div>

      <div className="flex w-full flex-col gap-4 lg:sticky lg:top-6 lg:w-96 lg:shrink-0">
        <ResumenVenta resumen={resumen} />

        {renglones.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            Escaneá o buscá un producto para empezar a cobrar.
          </p>
        ) : (
          <>
            {senaTotal > 0 && (
              <p className="flex justify-between text-sm text-muted-foreground">
                <span>Seña ya pagada ({pedidoActivo?.clienteNombre})</span>
                <span>-{formatearMoneda(senaTotal)}</span>
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={formaPago === "efectivo" ? "default" : "outline"}
                onClick={() => handleSeleccionarFormaPago("efectivo")}
              >
                <Banknote className="size-4" />
                Efectivo
              </Button>
              <Button
                type="button"
                variant={formaPago === "mercado_pago" ? "default" : "outline"}
                onClick={() => handleSeleccionarFormaPago("mercado_pago")}
              >
                <QrCode className="size-4" />
                Mercado Pago
              </Button>
              <Button
                type="button"
                variant={formaPago === "combinado" ? "default" : "outline"}
                onClick={() => handleSeleccionarFormaPago("combinado")}
              >
                <Split className="size-4" />
                Combinado
              </Button>
              <Button
                type="button"
                variant={formaPago === "tarjeta_debito" ? "default" : "outline"}
                onClick={() => handleSeleccionarFormaPago("tarjeta_debito")}
                disabled={senaTotal > 0}
              >
                <CreditCard className="size-4" />
                Débito
              </Button>
              <Button
                type="button"
                variant={formaPago === "tarjeta_credito" ? "default" : "outline"}
                onClick={() => handleSeleccionarFormaPago("tarjeta_credito")}
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
              <div className="flex flex-col gap-2">
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
                Ya podés cargar {formatearMoneda(mercadoPago)} en el POSNET de Mercado Pago.
              </p>
            )}

            {efectivo > 0 && (
              <div className="flex flex-col gap-2">
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

            <Button
              type="button"
              size="lg"
              onClick={handleConfirmar}
              disabled={!habilitado || isLoading || generandoQr}
            >
              <ShoppingCart className="size-4" />
              {isLoading || generandoQr
                ? "Confirmando..."
                : `Confirmar venta (${formatearMoneda(esTarjeta ? totalConRecargo : total)})`}
            </Button>
          </>
        )}

        {productoPesoPendiente && (
          <PesoDialog
            producto={productoPesoPendiente}
            onConfirmar={confirmarPeso}
            onCancelar={() => setProductoPesoPendiente(null)}
          />
        )}
      </div>
    </div>
  );
}
