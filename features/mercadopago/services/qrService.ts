import "server-only";
import { mercadoPagoFetch } from "@/lib/mercadopago";

// RF-7.1. Forma de la orden confirmada empíricamente contra la API real (sandbox) — la
// documentación pública resumida no coincidía del todo (ver docs/backlog/08-mercadopago.md#E8-2
// para el detalle de lo que costó llegar a este payload exacto).
export interface CrearOrdenQrInput {
  externalPosId: string;
  externalReference: string;
  montoTotal: number;
  descripcion: string;
}

export interface OrdenQr {
  ordenId: string;
  qrData: string;
  paymentId: string;
}

export interface RespuestaOrdenQr {
  id: string;
  status: string;
  external_reference: string;
  transactions: { payments: { id: string; amount: string; status: string; status_detail: string }[] };
  type_response: { qr_data: string };
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
        qr: { external_pos_id: input.externalPosId, mode: "dynamic" },
      },
      transactions: { payments: [{ amount: montoTexto }] },
    }),
  });

  return {
    ordenId: data.id,
    qrData: data.type_response.qr_data,
    paymentId: data.transactions.payments[0].id,
  };
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
