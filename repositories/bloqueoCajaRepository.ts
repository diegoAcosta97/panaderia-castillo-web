import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

export type BloqueoCajaProducto = Database["public"]["Tables"]["bloqueo_caja_productos"]["Row"];
export type BloqueoCajaConteo = Database["public"]["Tables"]["bloqueo_caja_conteos"]["Row"];
export type BloqueoCajaConteoItem =
  Database["public"]["Tables"]["bloqueo_caja_conteo_items"]["Row"];

export const BLOQUEO_CAJA_MAX_PRODUCTOS = 10;

export async function listBloqueoCajaProductos(
  supabase: SupabaseClient<Database>,
): Promise<BloqueoCajaProducto[]> {
  const { data, error } = await supabase
    .from("bloqueo_caja_productos")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return data;
}

// E4-4: solo admin puede insertar (RLS) -- el propio `with check` de la policy además rechaza
// el insert si ya hay 10 productos, esto es un límite en el cliente para el mensaje inmediato.
export async function agregarBloqueoCajaProducto(
  supabase: SupabaseClient<Database>,
  productoId: string,
): Promise<BloqueoCajaProducto> {
  const { data, error } = await supabase
    .from("bloqueo_caja_productos")
    .insert({ producto_id: productoId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function quitarBloqueoCajaProducto(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("bloqueo_caja_productos").delete().eq("id", id);
  if (error) throw error;
}

export interface ItemConteoInput {
  productoId: string;
  cantidad: number;
}

// E4-4: registrar_conteo_bloqueo_caja es SECURITY DEFINER -- valida que se contó exactamente la
// lista vigente de bloqueo_caja_productos, que el turno sigue abierto y que no se cargó ya un
// conteo para este turno.
export async function registrarConteoBloqueoCaja(
  supabase: SupabaseClient<Database>,
  turnoId: string,
  items: ItemConteoInput[],
): Promise<string> {
  const { data, error } = await supabase.rpc("registrar_conteo_bloqueo_caja", {
    p_turno_id: turnoId,
    p_items: items.map((i) => ({ producto_id: i.productoId, cantidad: i.cantidad })) as Json,
  });
  if (error) throw error;
  return data;
}

export async function getConteoBloqueoCajaPorTurno(
  supabase: SupabaseClient<Database>,
  turnoId: string,
): Promise<BloqueoCajaConteo | null> {
  const { data, error } = await supabase
    .from("bloqueo_caja_conteos")
    .select("*")
    .eq("caja_turno_id", turnoId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// E4-4: historial para que el administrador compare sistema vs. contado, más reciente primero.
export async function listBloqueoCajaConteos(
  supabase: SupabaseClient<Database>,
): Promise<BloqueoCajaConteo[]> {
  const { data, error } = await supabase
    .from("bloqueo_caja_conteos")
    .select("*")
    .order("fecha", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getItemsBloqueoCajaConteo(
  supabase: SupabaseClient<Database>,
  conteoId: string,
): Promise<BloqueoCajaConteoItem[]> {
  const { data, error } = await supabase
    .from("bloqueo_caja_conteo_items")
    .select("*")
    .eq("bloqueo_caja_conteo_id", conteoId);
  if (error) throw error;
  return data;
}

// E4-4: todos los items con diferencia != 0 de todos los conteos -- para que el administrador
// vea de un vistazo qué se detectó en los controles sorpresivos, sin abrir turno por turno.
export async function listBloqueoCajaConteoItemsConDiferencia(
  supabase: SupabaseClient<Database>,
): Promise<BloqueoCajaConteoItem[]> {
  const { data, error } = await supabase
    .from("bloqueo_caja_conteo_items")
    .select("*")
    .neq("diferencia", 0);
  if (error) throw error;
  return data;
}
