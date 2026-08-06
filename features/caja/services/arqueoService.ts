import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { CajaTurno } from "@/repositories/cajaTurnosRepository";
import { sumaGastosPorTurno } from "@/repositories/gastosRepository";

// RF-5.4: efectivo_esperado = apertura + ventas en efectivo del turno − gastos en efectivo del
// turno. Gastos ya se calcula real (EPIC 5). Ventas sigue en 0 a propósito
// (docs/backlog/04-caja.md#E4-3, nota de orden de ejecución): no existen `ventas`/
// `venta_medios_pago` todavía (EPIC 7). Completar acá cuando esa tabla exista — no en otro
// lado, este es el único punto que calcula el arqueo.
export async function calcularEfectivoEsperado(
  supabase: SupabaseClient<Database>,
  turno: CajaTurno,
): Promise<number> {
  const ventasEfectivo = 0; // TODO(EPIC 7): sumar venta_medios_pago.monto de este turno donde medio_pago = 'efectivo'
  const gastosEfectivo = await sumaGastosPorTurno(supabase, turno.id);

  return Number(turno.monto_apertura) + ventasEfectivo - gastosEfectivo;
}
