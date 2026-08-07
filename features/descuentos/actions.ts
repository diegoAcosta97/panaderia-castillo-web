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

async function requireAdmin() {
  const session = await getServerSession();
  if (!session || session.rol !== "administrador") {
    throw new Error("No autorizado.");
  }
}

export async function crearDescuento(input: DescuentoInput): Promise<Descuento> {
  await requireAdmin();
  const supabase = await createClient();
  const descuento = await crearDescuentoRepo(supabase, input);
  revalidatePath("/admin/descuentos");
  return descuento;
}

export async function actualizarDescuento(id: string, input: DescuentoInput) {
  await requireAdmin();
  const supabase = await createClient();
  await actualizarDescuentoRepo(supabase, id, input);
  revalidatePath("/admin/descuentos");
}

export async function actualizarDescuentoActivo(id: string, activo: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await actualizarDescuentoActivoRepo(supabase, id, activo);
  revalidatePath("/admin/descuentos");
}
