import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrdenQr, ordenAcreditada, ordenRechazada } from "@/features/mercadopago/services/qrService";
import { procesarResultadoPagoMP } from "@/repositories/ventasRepository";

// E8-3: Mercado Pago pega acá server-to-server, sin sesión de usuario -- por eso esta ruta está
// exceptuada del proxy (lib/supabase/proxy.ts, isPublicPath). NO se valida por firma
// (x-signature): la documentación oficial de Mercado Pago dice explícitamente que las
// notificaciones de Código QR no se pueden validar con la clave secreta. La seguridad acá viene
// de otro lado: el webhook nunca actúa sobre lo que dice el payload -- lo único que hace con el
// body es "andá a mirar la orden X", y siempre re-consulta el estado real a la API de Mercado
// Pago con nuestro propio access token antes de tocar la base. Un payload falso apuntando a una
// orden real no logra nada (se re-lee el estado real); un payload apuntando a una orden
// inexistente falla al reconsultar y no hace nada.
export async function POST(request: NextRequest) {
  let body: { type?: string; topic?: string; data?: { id?: string } };
  try {
    body = await request.json();
  } catch {
    // Payload no es JSON válido -- no es una notificación que podamos procesar. 200 para que MP
    // no reintente algo que nunca va a poder parsear distinto.
    return NextResponse.json({ ok: true });
  }

  const topic = body.type ?? body.topic;
  const orderId = body.data?.id;

  if (topic !== "orders" || !orderId) {
    // Notificación de un topic que no nos interesa (ej. payment de otro flujo) -- 200 igual.
    return NextResponse.json({ ok: true });
  }

  try {
    const orden = await getOrdenQr(orderId);
    const admin = createAdminClient();

    if (ordenAcreditada(orden)) {
      const pago = orden.transactions.payments.find((p) => p.status_detail === "accredited");
      await procesarResultadoPagoMP(admin, orden.external_reference, pago?.id ?? "", true);
    } else if (ordenRechazada(orden)) {
      await procesarResultadoPagoMP(admin, orden.external_reference, "", false);
    }
    // Si no está ni acreditada ni rechazada todavía (sigue "created"/"ready_to_process"), no
    // hay nada que hacer -- se espera la próxima notificación.
  } catch (err) {
    // No dejamos que un error acá tire un 500: MP reintentaría indefinidamente algo que ya
    // quedó logueado para revisar a mano. 200 de todos modos.
    console.error("Error procesando webhook de Mercado Pago:", err);
  }

  return NextResponse.json({ ok: true });
}
