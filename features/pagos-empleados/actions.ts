"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/features/auth/services/sessionService";
import { createClient } from "@/lib/supabase/server";
import { getTurnoAbierto } from "@/repositories/cajaTurnosRepository";
import { getEmpleado } from "@/repositories/empleadosRepository";
import {
  crearPagoEmpleado as crearPagoEmpleadoRepo,
  type PagoEmpleado,
} from "@/repositories/pagosEmpleadosRepository";
import { ejecutarAccion, type ActionResult } from "@/lib/actionResult";

async function requireAdmin() {
  const session = await getServerSession();
  if (!session || session.rol !== "administrador") {
    throw new Error("No autorizado.");
  }
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// Solo el admin carga pagos a empleados (a diferencia de gastos, que también puede cargar el
// cajero). Nunca recibe caja_turno_id del cliente: siempre resuelve el turno abierto server-side
// (mismo criterio que features/gastos/actions.ts#crearGasto). El período se resuelve acá según
// el tipo de cobro del empleado, nunca confiando en lo que decida mandar el cliente para
// "por_dia": siempre es la fecha de hoy.
export async function registrarPagoEmpleado(input: {
  empleadoId: string;
  monto: number;
  periodoDesde?: string;
  periodoHasta?: string;
  observaciones?: string;
}): Promise<ActionResult<PagoEmpleado>> {
  return ejecutarAccion(async () => {
    await requireAdmin();

    const supabase = await createClient();
    const [turno, empleado] = await Promise.all([
      getTurnoAbierto(supabase),
      getEmpleado(supabase, input.empleadoId),
    ]);
    if (!turno) throw new Error("No hay un turno de caja abierto.");

    let periodoDesde: string;
    let periodoHasta: string;
    if (empleado.tipo_cobro === "quincena") {
      if (!input.periodoDesde || !input.periodoHasta) {
        throw new Error("Indicá el período (desde/hasta) que cubre este pago quincenal.");
      }
      periodoDesde = input.periodoDesde;
      periodoHasta = input.periodoHasta;
    } else {
      periodoDesde = hoyISO();
      periodoHasta = periodoDesde;
    }

    const pago = await crearPagoEmpleadoRepo(supabase, {
      caja_turno_id: turno.id,
      empleado_id: input.empleadoId,
      monto: input.monto,
      periodo_desde: periodoDesde,
      periodo_hasta: periodoHasta,
      observaciones: input.observaciones || null,
    });

    revalidatePath("/admin/pagos-empleados");
    return pago;
  }, "No se pudo registrar el pago");
}
