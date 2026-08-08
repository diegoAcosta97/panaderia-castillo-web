import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { CajaTurno } from "@/repositories/cajaTurnosRepository";
import { sumaGastosPorTurno } from "@/repositories/gastosRepository";
import { sumaVentasEfectivoPorTurno } from "@/repositories/ventasRepository";

// RF-5.4: efectivo_esperado = apertura + ventas en efectivo del turno − gastos en efectivo del
// turno. Usado solo como vista previa en /pos/caja/cierre antes de confirmar -- el valor que
// efectivamente se persiste lo recalcula cerrar_turno (SECURITY DEFINER) server-side con la
// misma fórmula, nunca confía en lo que mande el cliente (E13-1,
// 20260808220005_create_cerrar_turno_function.sql).
//
// E13-1: hasta esta migración, `ventasEfectivo` había quedado hardcodeado en 0 desde EPIC 4 con
// un TODO ("completar cuando exista venta_medios_pago") que nunca se completó después de que
// EPIC 7 la creó -- todo turno cerrado hasta ahora calculó su efectivo_esperado/diferencia sin
// contar ninguna venta en efectivo. Corregido acá.
export async function calcularEfectivoEsperado(
  supabase: SupabaseClient<Database>,
  turno: CajaTurno,
): Promise<number> {
  const [ventasEfectivo, gastosEfectivo] = await Promise.all([
    sumaVentasEfectivoPorTurno(supabase, turno.id),
    sumaGastosPorTurno(supabase, turno.id),
  ]);

  return Number(turno.monto_apertura) + ventasEfectivo - gastosEfectivo;
}
