"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/features/auth/services/sessionService";
import { createClient } from "@/lib/supabase/server";
import {
  crearOferta as crearOfertaRepo,
  actualizarOferta as actualizarOfertaRepo,
  actualizarOfertaActivo as actualizarOfertaActivoRepo,
  type Oferta,
  type OfertaInput,
} from "@/repositories/ofertasRepository";
import { ejecutarAccion, type ActionResult } from "@/lib/actionResult";

async function requireAdmin() {
  const session = await getServerSession();
  if (!session || session.rol !== "administrador") {
    throw new Error("No autorizado.");
  }
}

export async function crearOferta(input: OfertaInput): Promise<ActionResult<Oferta>> {
  return ejecutarAccion(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const oferta = await crearOfertaRepo(supabase, input);
    revalidatePath("/admin/ofertas");
    return oferta;
  }, "No se pudo crear la oferta");
}

export async function actualizarOferta(id: string, input: OfertaInput): Promise<ActionResult<void>> {
  return ejecutarAccion(async () => {
    await requireAdmin();
    const supabase = await createClient();
    await actualizarOfertaRepo(supabase, id, input);
    revalidatePath("/admin/ofertas");
  }, "No se pudo actualizar la oferta");
}

export async function actualizarOfertaActivo(id: string, activo: boolean): Promise<ActionResult<void>> {
  return ejecutarAccion(async () => {
    await requireAdmin();
    const supabase = await createClient();
    await actualizarOfertaActivoRepo(supabase, id, activo);
    revalidatePath("/admin/ofertas");
  }, "No se pudo actualizar la oferta");
}
