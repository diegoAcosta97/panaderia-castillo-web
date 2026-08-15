"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/features/auth/services/sessionService";
import { createClient } from "@/lib/supabase/server";
import {
  crearControlStock,
  insertarDetalles,
  cerrarControlStock,
  aprobarControlStock as aprobarControlStockRepo,
  rechazarControlStock as rechazarControlStockRepo,
  type ControlStock,
  type DetalleInput,
} from "@/repositories/controlStockRepository";
import { ejecutarAccion, type ActionResult } from "@/lib/actionResult";

async function requireAdmin() {
  const session = await getServerSession();
  if (!session || session.rol !== "administrador") {
    throw new Error("No autorizado.");
  }
  return session;
}

// E11-2: hace los 3 pasos del conteo en una sola acción -- crea el control (en_progreso),
// carga todos los detalles contados y lo cierra (pendiente_aprobacion + fecha_cierre). No es una
// transacción de base de datos (son 3 llamadas RLS-gated, no una función SECURITY DEFINER, ver
// nota en la migración de E11-1) pero es una operación admin de baja frecuencia, sin
// concurrencia esperada.
export async function finalizarConteo(
  detalles: DetalleInput[],
  observaciones: string,
): Promise<ActionResult<ControlStock>> {
  return ejecutarAccion(async () => {
    const session = await requireAdmin();
    if (detalles.length === 0) {
      throw new Error("No hay productos para contar.");
    }

    const supabase = await createClient();
    const control = await crearControlStock(supabase, session.user.id);
    await insertarDetalles(supabase, control.id, detalles);
    await cerrarControlStock(supabase, control.id, observaciones || null);

    revalidatePath("/admin/control-stock");
    return control;
  }, "No se pudo finalizar el conteo");
}

export async function aprobarControlStock(controlStockId: string): Promise<ActionResult<void>> {
  return ejecutarAccion(async () => {
    const session = await requireAdmin();
    const supabase = await createClient();
    await aprobarControlStockRepo(supabase, controlStockId, session.user.id);

    revalidatePath("/admin/control-stock");
    revalidatePath(`/admin/control-stock/${controlStockId}`);
    revalidatePath("/admin/productos");
  }, "No se pudo aprobar el control de stock");
}

export async function rechazarControlStock(controlStockId: string): Promise<ActionResult<void>> {
  return ejecutarAccion(async () => {
    const session = await requireAdmin();
    const supabase = await createClient();
    await rechazarControlStockRepo(supabase, controlStockId, session.user.id);

    revalidatePath("/admin/control-stock");
    revalidatePath(`/admin/control-stock/${controlStockId}`);
  }, "No se pudo rechazar el control de stock");
}
