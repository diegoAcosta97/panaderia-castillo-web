"use server";

import { getServerSession } from "@/features/auth/services/sessionService";
import { createClient } from "@/lib/supabase/server";
import { getMediosPagoVenta, registrarQrPago } from "@/repositories/ventasRepository";
import { getConfiguracionNegocio } from "@/repositories/configuracionRepository";
import { crearOrdenQr } from "@/features/mercadopago/services/qrService";

// E8-2: genera el QR dinámico para la porción de la venta asignada a Mercado Pago. La venta ya
// tiene que existir en estado pendiente_pago (creada por confirmar_venta, E7-3) con su
// venta_medios_pago 'mercado_pago' en estado 'pendiente' -- esta acción no crea la venta, solo
// arma el cobro para el medio que ya quedó pendiente.
export async function generarQrParaVenta(ventaId: string): Promise<{ qrData: string }> {
  const session = await getServerSession();
  if (!session) throw new Error("No autorizado.");

  const supabase = await createClient();
  const [mediosPago, negocio] = await Promise.all([
    getMediosPagoVenta(supabase, ventaId),
    getConfiguracionNegocio(supabase),
  ]);

  const medioMP = mediosPago.find(
    (m) => m.medio_pago === "mercado_pago" && m.estado_pago === "pendiente",
  );
  if (!medioMP) {
    throw new Error("Esta venta no tiene un medio de pago de Mercado Pago pendiente.");
  }
  if (!negocio.mercadopago_external_pos_id) {
    throw new Error("Falta configurar la caja de Mercado Pago del comercio.");
  }

  const orden = await crearOrdenQr({
    externalPosId: negocio.mercadopago_external_pos_id,
    // Referencia propia = el id del propio medio de pago: no hace falta guardar el order_id de
    // MP en ningún lado -- cuando llegue el webhook, se re-consulta la orden a la API de MP y
    // se matchea por este mismo valor (external_reference que la propia MP nos devuelve).
    externalReference: medioMP.id,
    montoTotal: Number(medioMP.monto),
    descripcion: `${negocio.nombre_comercial} — venta`,
  });

  await registrarQrPago(supabase, medioMP.id, medioMP.id, orden.paymentId);

  return { qrData: orden.qrData };
}
