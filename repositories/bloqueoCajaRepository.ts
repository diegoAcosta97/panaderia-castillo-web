import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

export type BloqueoCajaProducto = Database["public"]["Tables"]["bloqueo_caja_productos"]["Row"];
export type BloqueoCajaConteo = Database["public"]["Tables"]["bloqueo_caja_conteos"]["Row"];

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

export type BloqueoCajaDiferencia = Database["public"]["Views"]["bloqueo_caja_diferencias"]["Row"];

export interface ListBloqueoCajaDiferenciasPaginadoParams {
  page: number;
  pageSize: number;
  sort?: { column: string; ascending: boolean };
  productoId?: string;
  categoriaId?: string;
  desde?: string;
  hasta?: string;
}

// E4-5: listado paginado/filtrable de "Diferencias detectadas" en /admin/bloqueo-caja -- con un
// conteo por cierre de turno esto crece sin techo, así que se pagina y filtra del lado del
// servidor contra la vista bloqueo_caja_diferencias (cruce de conteo_items + conteos + productos
// + categorias) en vez de traer todo.
export async function listBloqueoCajaDiferenciasPaginated(
  supabase: SupabaseClient<Database>,
  { page, pageSize, sort, productoId, categoriaId, desde, hasta }: ListBloqueoCajaDiferenciasPaginadoParams,
): Promise<{ data: BloqueoCajaDiferencia[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let request = supabase.from("bloqueo_caja_diferencias").select("*", { count: "exact" });
  if (productoId) request = request.eq("producto_id", productoId);
  if (categoriaId) request = request.eq("categoria_id", categoriaId);
  if (desde) request = request.gte("fecha", desde);
  if (hasta) request = request.lte("fecha", `${hasta}T23:59:59`);
  request = sort
    ? request.order(sort.column, { ascending: sort.ascending })
    : request.order("fecha", { ascending: false });

  const { data, error, count } = await request.range(from, to);
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

// Sibling sin paginar de listBloqueoCajaDiferenciasPaginated, mismos filtros -- usado para
// exportar a imprimible el conjunto filtrado completo (no solo la página visible).
export async function listBloqueoCajaDiferencias(
  supabase: SupabaseClient<Database>,
  filtros?: { productoId?: string; categoriaId?: string; desde?: string; hasta?: string },
): Promise<BloqueoCajaDiferencia[]> {
  let request = supabase.from("bloqueo_caja_diferencias").select("*");
  if (filtros?.productoId) request = request.eq("producto_id", filtros.productoId);
  if (filtros?.categoriaId) request = request.eq("categoria_id", filtros.categoriaId);
  if (filtros?.desde) request = request.gte("fecha", filtros.desde);
  if (filtros?.hasta) request = request.lte("fecha", `${filtros.hasta}T23:59:59`);

  const { data, error } = await request.order("fecha", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
