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

async function requireAdmin() {
  const session = await getServerSession();
  if (!session || session.rol !== "administrador") {
    throw new Error("No autorizado.");
  }
}

export async function crearOferta(input: OfertaInput): Promise<Oferta> {
  await requireAdmin();
  const supabase = await createClient();
  const oferta = await crearOfertaRepo(supabase, input);
  revalidatePath("/admin/ofertas");
  return oferta;
}

export async function actualizarOferta(id: string, input: OfertaInput) {
  await requireAdmin();
  const supabase = await createClient();
  await actualizarOfertaRepo(supabase, id, input);
  revalidatePath("/admin/ofertas");
}

export async function actualizarOfertaActivo(id: string, activo: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await actualizarOfertaActivoRepo(supabase, id, activo);
  revalidatePath("/admin/ofertas");
}
