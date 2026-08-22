"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/features/auth/services/sessionService";
import { createClient } from "@/lib/supabase/server";
import {
  crearCategoria as crearCategoriaRepo,
  actualizarCategoria as actualizarCategoriaRepo,
  type Categoria,
} from "@/repositories/categoriasRepository";
import {
  crearProducto as crearProductoRepo,
  actualizarProducto as actualizarProductoRepo,
  eliminarProducto as eliminarProductoRepo,
  type ActualizarProductoPatch,
  type NuevoProducto,
  type Producto,
} from "@/repositories/productosRepository";
import { ejecutarAccion, type ActionResult } from "@/lib/actionResult";
import { isPostgresErrorCode, POSTGRES_FOREIGN_KEY_VIOLATION } from "@/lib/errors";

async function requireAdmin() {
  const session = await getServerSession();
  if (!session || session.rol !== "administrador") {
    throw new Error("No autorizado.");
  }
}

export async function crearCategoria(nombre: string): Promise<ActionResult<Categoria>> {
  return ejecutarAccion(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const categoria = await crearCategoriaRepo(supabase, nombre);
    revalidatePath("/admin/productos/categorias");
    return categoria;
  }, "No se pudo crear la categoría");
}

export async function actualizarCategoria(
  id: string,
  patch: Partial<Pick<Categoria, "nombre" | "activo" | "habilitada_produccion">>,
): Promise<ActionResult<void>> {
  return ejecutarAccion(async () => {
    await requireAdmin();
    const supabase = await createClient();
    await actualizarCategoriaRepo(supabase, id, patch);
    revalidatePath("/admin/productos/categorias");
  }, "No se pudo actualizar la categoría");
}

export async function crearProducto(input: NuevoProducto): Promise<ActionResult<Producto>> {
  return ejecutarAccion(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const producto = await crearProductoRepo(supabase, input);
    revalidatePath("/admin/productos");
    return producto;
  }, "No se pudo crear el producto");
}

export async function actualizarProducto(
  id: string,
  patch: ActualizarProductoPatch,
): Promise<ActionResult<void>> {
  return ejecutarAccion(async () => {
    await requireAdmin();
    const supabase = await createClient();
    await actualizarProductoRepo(supabase, id, patch);
    revalidatePath("/admin/productos");
  }, "No se pudo actualizar el producto");
}

export async function eliminarProducto(id: string): Promise<ActionResult<void>> {
  return ejecutarAccion(async () => {
    await requireAdmin();
    const supabase = await createClient();
    try {
      await eliminarProductoRepo(supabase, id);
    } catch (err) {
      if (isPostgresErrorCode(err, POSTGRES_FOREIGN_KEY_VIOLATION)) {
        throw new Error(
          "No se puede eliminar: este producto tiene ventas, movimientos de stock u otro historial asociado. Desactivalo en cambio (columna Activo).",
        );
      }
      throw err;
    }
    revalidatePath("/admin/productos");
  }, "No se pudo eliminar el producto");
}

// Borra uno por uno en vez de un solo delete con `in (...)`: así un producto con historial (que
// la FK rechaza) no aborta a los demás -- se reporta aparte en `noEliminados` en lugar de fallar
// todo el lote (mismo criterio de eliminarProducto, aplicado ítem por ítem).
export async function eliminarProductos(
  ids: string[],
): Promise<ActionResult<{ eliminados: string[]; noEliminados: string[] }>> {
  return ejecutarAccion(async () => {
    await requireAdmin();
    const supabase = await createClient();
    const eliminados: string[] = [];
    const noEliminados: string[] = [];
    for (const id of ids) {
      try {
        await eliminarProductoRepo(supabase, id);
        eliminados.push(id);
      } catch (err) {
        if (isPostgresErrorCode(err, POSTGRES_FOREIGN_KEY_VIOLATION)) {
          noEliminados.push(id);
        } else {
          throw err;
        }
      }
    }
    revalidatePath("/admin/productos");
    return { eliminados, noEliminados };
  }, "No se pudieron eliminar los productos");
}
