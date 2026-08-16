"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/features/auth/services/sessionService";
import { createClient } from "@/lib/supabase/server";
import { actualizarConfiguracionNegocio } from "@/repositories/configuracionRepository";
import {
  agregarBloqueoCajaProducto as agregarBloqueoCajaProductoRepo,
  quitarBloqueoCajaProducto as quitarBloqueoCajaProductoRepo,
  listBloqueoCajaProductos,
  BLOQUEO_CAJA_MAX_PRODUCTOS,
  type BloqueoCajaProducto,
} from "@/repositories/bloqueoCajaRepository";
import { ejecutarAccion, type ActionResult } from "@/lib/actionResult";

async function requireAdmin() {
  const session = await getServerSession();
  if (!session || session.rol !== "administrador") {
    throw new Error("No autorizado.");
  }
}

export async function actualizarBloqueoCajaActivo(
  configuracionId: string,
  activo: boolean,
): Promise<ActionResult<void>> {
  return ejecutarAccion(async () => {
    await requireAdmin();
    const supabase = await createClient();

    if (activo) {
      const productos = await listBloqueoCajaProductos(supabase);
      if (productos.length === 0) {
        throw new Error("Elegí al menos un producto antes de activar el bloqueo de caja.");
      }
    }

    await actualizarConfiguracionNegocio(supabase, configuracionId, { bloqueo_caja_activo: activo });
    revalidatePath("/admin/bloqueo-caja");
    revalidatePath("/pos/caja/cierre");
  }, "No se pudo actualizar el bloqueo de caja");
}

export async function agregarProductoBloqueoCaja(
  productoId: string,
): Promise<ActionResult<BloqueoCajaProducto>> {
  return ejecutarAccion(async () => {
    await requireAdmin();
    const supabase = await createClient();

    const actuales = await listBloqueoCajaProductos(supabase);
    if (actuales.length >= BLOQUEO_CAJA_MAX_PRODUCTOS) {
      throw new Error(`Ya hay ${BLOQUEO_CAJA_MAX_PRODUCTOS} productos elegidos, es el máximo.`);
    }

    const producto = await agregarBloqueoCajaProductoRepo(supabase, productoId);
    revalidatePath("/admin/bloqueo-caja");
    return producto;
  }, "No se pudo agregar el producto");
}

export async function quitarProductoBloqueoCaja(id: string): Promise<ActionResult<void>> {
  return ejecutarAccion(async () => {
    await requireAdmin();
    const supabase = await createClient();
    await quitarBloqueoCajaProductoRepo(supabase, id);
    revalidatePath("/admin/bloqueo-caja");
  }, "No se pudo quitar el producto");
}
