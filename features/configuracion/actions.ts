"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/features/auth/services/sessionService";
import { createClient } from "@/lib/supabase/server";
import {
  actualizarConfiguracionNegocio as actualizarConfiguracionNegocioRepo,
  type ConfiguracionNegocio,
} from "@/repositories/configuracionRepository";

async function requireAdmin() {
  const session = await getServerSession();
  if (!session || session.rol !== "administrador") {
    throw new Error("No autorizado.");
  }
}

export async function actualizarConfiguracionNegocio(
  id: string,
  patch: Partial<
    Pick<ConfiguracionNegocio, "nombre_comercial" | "direccion" | "telefono" | "cuit">
  >,
) {
  await requireAdmin();
  const supabase = await createClient();
  await actualizarConfiguracionNegocioRepo(supabase, id, patch);
  revalidatePath("/admin/configuracion");
}
