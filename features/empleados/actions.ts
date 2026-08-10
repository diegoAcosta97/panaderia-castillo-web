"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/features/auth/services/sessionService";
import { createClient } from "@/lib/supabase/server";
import {
  crearEmpleado as crearEmpleadoRepo,
  actualizarEmpleado as actualizarEmpleadoRepo,
  type Empleado,
  type NuevoEmpleado,
} from "@/repositories/empleadosRepository";

async function requireAdmin() {
  const session = await getServerSession();
  if (!session || session.rol !== "administrador") {
    throw new Error("No autorizado.");
  }
}

export async function crearEmpleado(input: NuevoEmpleado): Promise<Empleado> {
  await requireAdmin();
  const supabase = await createClient();
  const empleado = await crearEmpleadoRepo(supabase, input);
  revalidatePath("/admin/empleados");
  return empleado;
}

export async function actualizarEmpleado(
  id: string,
  patch: Partial<Pick<Empleado, "nombre" | "tipo_cobro" | "activo">>,
) {
  await requireAdmin();
  const supabase = await createClient();
  await actualizarEmpleadoRepo(supabase, id, patch);
  revalidatePath("/admin/empleados");
}
