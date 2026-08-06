import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { CajaTurno } from "@/repositories/cajaTurnosRepository";

// RF-5.4: efectivo_esperado = apertura + ventas en efectivo del turno − gastos en efectivo del
// turno. Las dos sumas todavía están en 0 a propósito (docs/backlog/04-caja.md#E4-3, nota de
// orden de ejecución): no existen `gastos` (EPIC 5) ni `ventas`/`venta_medios_pago` (EPIC 7)
// todavía. Completar acá cuando esas tablas existan — no en otro lado, este es el único punto
// que calcula el arqueo.
export async function calcularEfectivoEsperado(
  _supabase: SupabaseClient<Database>,
  turno: CajaTurno,
): Promise<number> {
  const ventasEfectivo = 0; // TODO(EPIC 7): sumar venta_medios_pago.monto de este turno donde medio_pago = 'efectivo'
  const gastosEfectivo = 0; // TODO(EPIC 5): sumar gastos.monto de este turno

  return Number(turno.monto_apertura) + ventasEfectivo - gastosEfectivo;
}
