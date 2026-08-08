import "server-only";
import { mercadoPagoFetch, MercadoPagoError } from "@/lib/mercadopago";

// RF-7.1. Forma de la orden confirmada empíricamente contra la API real (sandbox) — la
// documentación pública resumida no coincidía del todo (ver docs/backlog/08-mercadopago.md#E8-2
// para el detalle de lo que costó llegar a este payload exacto).
//
// Modo "static" (no "dynamic"): el QR es fijo por caja, se imprime una sola vez (RF-7.1) y el
// cliente escanea siempre el mismo cartel -- cada venta solo asocia un monto nuevo a esa caja
// del lado de la API, sin generar una imagen de QR distinta. Por eso una orden en modo static
// no trae `type_response.qr_data`: no hay nada nuevo que renderizar.
export interface CrearOrdenQrInput {
  externalPosId: string;
  externalReference: string;
  montoTotal: number;
  descripcion: string;
}

export interface OrdenQr {
  ordenId: string;
  paymentId: string;
}

export interface RespuestaOrdenQr {
  id: string;
  status: string;
  external_reference: string;
  transactions: { payments: { id: string; amount: string; status: string; status_detail: string }[] };
}

// Confirmado con la API real: rechaza montos menores a $15.
export const MONTO_MINIMO_ORDEN_QR = 15;

export async function crearOrdenQr(input: CrearOrdenQrInput): Promise<OrdenQr> {
  if (input.montoTotal < MONTO_MINIMO_ORDEN_QR) {
    throw new Error(
      `Mercado Pago exige un monto mínimo de $${MONTO_MINIMO_ORDEN_QR} para cobrar con QR.`,
    );
  }

  const montoTexto = input.montoTotal.toFixed(2);

  const data = await mercadoPagoFetch<RespuestaOrdenQr>("/v1/orders", {
    method: "POST",
    headers: { "X-Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({
      type: "qr",
      total_amount: montoTexto,
      external_reference: input.externalReference,
      description: input.descripcion.slice(0, 150),
      config: {
        qr: { external_pos_id: input.externalPosId, mode: "static" },
      },
      transactions: { payments: [{ amount: montoTexto }] },
    }),
  });

  return {
    ordenId: data.id,
    paymentId: data.transactions.payments[0].id,
  };
}

// Cancela una orden abandonada (el cajero canceló el cobro antes de que el cliente pague) para
// liberar el QR estático de la caja. MP solo permite cancelar mientras status="created" (409
// en cualquier otro estado, p.ej. si el cliente ya la está pagando) -- eso no es un error real
// para quien llama: la venta ya se canceló del lado de la base de todos modos
// (cancelar_venta_pendiente corre antes, ver features/mercadopago/actions.ts), así que acá se
// swallowea en vez de propagarse.
export async function cancelarOrdenQr(ordenId: string): Promise<void> {
  try {
    await mercadoPagoFetch(`/v1/orders/${ordenId}/cancel`, {
      method: "POST",
      headers: { "X-Idempotency-Key": crypto.randomUUID() },
    });
  } catch (err) {
    if (err instanceof MercadoPagoError && err.status === 409) return;
    throw err;
  }
}

// E8-3: la única fuente de verdad sobre si una orden está pagada -- el webhook nunca confía en
// su propio payload, siempre reconsulta acá con nuestro access token antes de tocar nada.
export async function getOrdenQr(ordenId: string): Promise<RespuestaOrdenQr> {
  return mercadoPagoFetch<RespuestaOrdenQr>(`/v1/orders/${ordenId}`);
}

// Confirmado con la documentación oficial: una orden pagada queda status "processed" con el
// pago en status_detail "accredited".
export function ordenAcreditada(orden: RespuestaOrdenQr): boolean {
  return (
    orden.status === "processed" &&
    orden.transactions.payments.some((p) => p.status_detail === "accredited")
  );
}

// "canceled"/"expired" (venció el tiempo del QR) u otro estado terminal no exitoso -- distinto
// de "todavía no pasó nada" (created/ready_to_process), que no es ni acreditado ni rechazado.
export function ordenRechazada(orden: RespuestaOrdenQr): boolean {
  return orden.status === "canceled" || orden.status === "expired";
}
