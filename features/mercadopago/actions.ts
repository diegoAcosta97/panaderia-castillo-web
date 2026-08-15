"use server";

import { getServerSession } from "@/features/auth/services/sessionService";
import { createClient } from "@/lib/supabase/server";
import {
  getMediosPagoVenta,
  registrarQrPago,
  hayPagoMercadoPagoPendiente,
  cancelarVentaPendiente,
} from "@/repositories/ventasRepository";
import { getConfiguracionNegocio } from "@/repositories/configuracionRepository";
import { crearOrdenQr, cancelarOrdenQr } from "@/features/mercadopago/services/qrService";
import { ejecutarAccion, type ActionResult } from "@/lib/actionResult";

// E8-2: asocia el monto de la venta al QR estático de la caja (docs/backlog/08-mercadopago.md).
// La venta ya tiene que existir en estado pendiente_pago (creada por confirmar_venta, E7-3) con
// su venta_medios_pago 'mercado_pago' en estado 'pendiente' -- esta acción no crea la venta,
// solo arma el cobro para el medio que ya quedó pendiente. Con una sola caja física, el QR es
// fijo (se imprime una vez) y solo puede reflejar una orden vigente a la vez -- por eso el
// chequeo de hayPagoMercadoPagoPendiente antes de crear una nueva.
export async function generarQrParaVenta(ventaId: string): Promise<ActionResult<void>> {
  return ejecutarAccion(async () => {
    const session = await getServerSession();
    if (!session) throw new Error("No autorizado.");

    const supabase = await createClient();
    const [mediosPago, negocio, hayPendiente] = await Promise.all([
      getMediosPagoVenta(supabase, ventaId),
      getConfiguracionNegocio(supabase),
      hayPagoMercadoPagoPendiente(supabase, ventaId),
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
    if (hayPendiente) {
      throw new Error(
        "Ya hay un cobro con Mercado Pago esperando confirmación en esta caja. Cancelalo o esperá a que se acredite antes de generar otro.",
      );
    }

    const orden = await crearOrdenQr({
      externalPosId: negocio.mercadopago_external_pos_id,
      // Referencia propia = el id del propio medio de pago: cuando llegue el webhook, se
      // re-consulta la orden a la API de MP y se matchea por este mismo valor (external_reference
      // que la propia MP nos devuelve).
      externalReference: medioMP.id,
      montoTotal: Number(medioMP.monto),
      descripcion: `${negocio.nombre_comercial} — venta`,
    });

    await registrarQrPago(supabase, medioMP.id, medioMP.id, orden.paymentId, orden.ordenId);
  }, "No se pudo generar el cobro de Mercado Pago");
}

// El cajero abandona el cobro (el cliente no llegó a pagar) -- libera la caja para la próxima
// venta. Cancela primero del lado de la base (lo que de verdad destraba hayPagoMercadoPagoPendiente)
// y después, a mejor esfuerzo, cancela la orden en Mercado Pago (no bloquea el flujo si falla:
// la próxima orden que se cree igual reemplaza a esta en el QR estático).
export async function cancelarPagoMPPendiente(ventaId: string): Promise<ActionResult<void>> {
  return ejecutarAccion(async () => {
    const session = await getServerSession();
    if (!session) throw new Error("No autorizado.");

    const supabase = await createClient();
    const { mp_orden_id } = await cancelarVentaPendiente(supabase, ventaId);

    if (mp_orden_id) {
      try {
        await cancelarOrdenQr(mp_orden_id);
      } catch (err) {
        console.error("No se pudo cancelar la orden en Mercado Pago (venta ya cancelada localmente):", err);
      }
    }
  }, "No se pudo cancelar el cobro");
}
