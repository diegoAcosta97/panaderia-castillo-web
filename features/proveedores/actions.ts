"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/features/auth/services/sessionService";
import { createClient } from "@/lib/supabase/server";
import {
  crearProveedor as crearProveedorRepo,
  actualizarProveedor as actualizarProveedorRepo,
  type NuevoProveedor,
  type Proveedor,
} from "@/repositories/proveedoresRepository";
import { ejecutarAccion, type ActionResult } from "@/lib/actionResult";

async function requireAdmin() {
  const session = await getServerSession();
  if (!session || session.rol !== "administrador") {
    throw new Error("No autorizado.");
  }
}

export async function crearProveedor(input: NuevoProveedor): Promise<ActionResult<Proveedor>> {
  return ejecutarAccion(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const proveedor = await crearProveedorRepo(supabase, input);
    revalidatePath("/admin/proveedores");
    return proveedor;
  }, "No se pudo crear el proveedor");
}

export async function actualizarProveedor(
  id: string,
  patch: Partial<Pick<Proveedor, "nombre" | "cuit" | "telefono" | "email" | "direccion" | "activo">>,
): Promise<ActionResult<void>> {
  return ejecutarAccion(async () => {
    await requireAdmin();
    const supabase = await createClient();
    await actualizarProveedorRepo(supabase, id, patch);
    revalidatePath("/admin/proveedores");
  }, "No se pudo actualizar el proveedor");
}
