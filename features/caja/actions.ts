"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/features/auth/services/sessionService";
import { createClient } from "@/lib/supabase/server";
import {
  abrirTurno as abrirTurnoRepo,
  cerrarTurno as cerrarTurnoRepo,
  type CajaTurno,
} from "@/repositories/cajaTurnosRepository";

async function requireSession() {
  const session = await getServerSession();
  if (!session) throw new Error("No autorizado.");
}

export async function abrirTurno(
  montoApertura: number,
  etiquetaTurno: string,
): Promise<CajaTurno> {
  await requireSession();
  const supabase = await createClient();
  const turno = await abrirTurnoRepo(supabase, montoApertura, etiquetaTurno || null);
  revalidatePath("/pos/caja");
  return turno;
}

export async function cerrarTurno(
  id: string,
  montoCierreDeclarado: number,
  observaciones: string,
): Promise<CajaTurno> {
  await requireSession();
  const supabase = await createClient();

  const cerrado = await cerrarTurnoRepo(supabase, id, montoCierreDeclarado, observaciones || null);

  revalidatePath("/pos/caja");
  revalidatePath("/admin/caja");
  return cerrado;
}
