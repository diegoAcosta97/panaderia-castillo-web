"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/features/auth/services/sessionService";
import { createClient } from "@/lib/supabase/server";
import {
  crearDescuento as crearDescuentoRepo,
  actualizarDescuento as actualizarDescuentoRepo,
  actualizarDescuentoActivo as actualizarDescuentoActivoRepo,
  type Descuento,
  type DescuentoInput,
} from "@/repositories/descuentosRepository";
import { ejecutarAccion, type ActionResult } from "@/lib/actionResult";

async function requireAdmin() {
  const session = await getServerSession();
  if (!session || session.rol !== "administrador") {
    throw new Error("No autorizado.");
  }
}

export async function crearDescuento(input: DescuentoInput): Promise<ActionResult<Descuento>> {
  return ejecutarAccion(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const descuento = await crearDescuentoRepo(supabase, input);
    revalidatePath("/admin/descuentos");
    return descuento;
  }, "No se pudo crear el descuento");
}

export async function actualizarDescuento(id: string, input: DescuentoInput): Promise<ActionResult<void>> {
  return ejecutarAccion(async () => {
    await requireAdmin();
    const supabase = await createClient();
    await actualizarDescuentoRepo(supabase, id, input);
    revalidatePath("/admin/descuentos");
  }, "No se pudo actualizar el descuento");
}

export async function actualizarDescuentoActivo(id: string, activo: boolean): Promise<ActionResult<void>> {
  return ejecutarAccion(async () => {
    await requireAdmin();
    const supabase = await createClient();
    await actualizarDescuentoActivoRepo(supabase, id, activo);
    revalidatePath("/admin/descuentos");
  }, "No se pudo actualizar el descuento");
}
