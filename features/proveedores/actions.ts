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

async function requireAdmin() {
  const session = await getServerSession();
  if (!session || session.rol !== "administrador") {
    throw new Error("No autorizado.");
  }
}

export async function crearProveedor(input: NuevoProveedor): Promise<Proveedor> {
  await requireAdmin();
  const supabase = await createClient();
  const proveedor = await crearProveedorRepo(supabase, input);
  revalidatePath("/admin/proveedores");
  return proveedor;
}

export async function actualizarProveedor(
  id: string,
  patch: Partial<Pick<Proveedor, "nombre" | "cuit" | "telefono" | "email" | "direccion" | "activo">>,
) {
  await requireAdmin();
  const supabase = await createClient();
  await actualizarProveedorRepo(supabase, id, patch);
  revalidatePath("/admin/proveedores");
}
