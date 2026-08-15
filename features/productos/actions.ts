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
  type NuevoProducto,
  type Producto,
} from "@/repositories/productosRepository";

async function requireAdmin() {
  const session = await getServerSession();
  if (!session || session.rol !== "administrador") {
    throw new Error("No autorizado.");
  }
}

export async function crearCategoria(nombre: string): Promise<Categoria> {
  await requireAdmin();
  const supabase = await createClient();
  const categoria = await crearCategoriaRepo(supabase, nombre);
  revalidatePath("/admin/productos/categorias");
  return categoria;
}

export async function actualizarCategoria(
  id: string,
  patch: Partial<Pick<Categoria, "nombre" | "activo">>,
) {
  await requireAdmin();
  const supabase = await createClient();
  await actualizarCategoriaRepo(supabase, id, patch);
  revalidatePath("/admin/productos/categorias");
}

export async function crearProducto(input: NuevoProducto): Promise<Producto> {
  await requireAdmin();
  const supabase = await createClient();
  const producto = await crearProductoRepo(supabase, input);
  revalidatePath("/admin/productos");
  return producto;
}

export async function actualizarProducto(
  id: string,
  patch: Partial<
    Pick<
      Producto,
      | "nombre"
      | "categoria_id"
      | "codigo_barras"
      | "precio"
      | "costo"
      | "controla_stock"
      | "stock_minimo"
      | "dias_vencimiento_default"
      | "activo"
    >
  >,
) {
  await requireAdmin();
  const supabase = await createClient();
  await actualizarProductoRepo(supabase, id, patch);
  revalidatePath("/admin/productos");
}
