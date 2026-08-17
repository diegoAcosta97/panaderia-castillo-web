"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/features/auth/services/sessionService";
import { createClient } from "@/lib/supabase/server";
import {
  crearProduccion as crearProduccionRepo,
  completarProduccion as completarProduccionRepo,
  cancelarProduccion as cancelarProduccionRepo,
  type NuevaProduccionInput,
  type CompletarProduccionItemInput,
} from "@/repositories/produccionRepository";
import { ejecutarAccion, type ActionResult } from "@/lib/actionResult";

// E16-2: producción es enteramente admin (a diferencia de ingreso de mercadería, que un cajero
// también puede cargar) -- las tres funciones SECURITY DEFINER ya validan is_administrador() del
// lado del servidor, este gate es solo para devolver un error legible antes de llamarlas.
async function requireAdmin() {
  const session = await getServerSession();
  if (!session || session.rol !== "administrador") {
    throw new Error("No autorizado.");
  }
}

export async function crearProduccion(
  input: NuevaProduccionInput,
): Promise<ActionResult<{ id: string }>> {
  return ejecutarAccion(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const resultado = await crearProduccionRepo(supabase, input);
    revalidatePath("/admin/produccion");
    return resultado;
  }, "No se pudo crear la producción");
}

export async function completarProduccion(
  produccionId: string,
  items: CompletarProduccionItemInput[],
): Promise<ActionResult<{ id: string }>> {
  return ejecutarAccion(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const resultado = await completarProduccionRepo(supabase, produccionId, items);
    revalidatePath("/admin/produccion");
    revalidatePath(`/admin/produccion/${produccionId}`);
    revalidatePath("/admin/productos");
    return resultado;
  }, "No se pudo completar la producción");
}

export async function cancelarProduccion(produccionId: string): Promise<ActionResult<void>> {
  return ejecutarAccion(async () => {
    await requireAdmin();
    const supabase = await createClient();
    await cancelarProduccionRepo(supabase, produccionId);
    revalidatePath("/admin/produccion");
    revalidatePath(`/admin/produccion/${produccionId}`);
  }, "No se pudo cancelar la producción");
}
