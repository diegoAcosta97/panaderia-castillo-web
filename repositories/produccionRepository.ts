import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

export type Produccion = Database["public"]["Tables"]["producciones"]["Row"];
export type ProduccionItem = Database["public"]["Tables"]["produccion_items"]["Row"];

export interface NuevaProduccionInput {
  empleadoId: string;
  fechaPedido: string;
  fechaEntrega: string;
  items: { productoId: string; cantidad: number }[];
  observaciones?: string | null;
}

export interface CompletarProduccionItemInput {
  productoId: string;
  cantidadProducida: number;
}

// E16-3: toda la escritura pasa por funciones SECURITY DEFINER (crear/completar/cancelar
// producción, docs/backlog/16-produccion.md) -- no hay policy de insert/update para
// `authenticated`, mismo endurecimiento que confirmar_venta/crear_ingreso_mercaderia.
export async function crearProduccion(
  supabase: SupabaseClient<Database>,
  input: NuevaProduccionInput,
): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc("crear_produccion", {
    p_empleado_id: input.empleadoId,
    p_fecha_pedido: input.fechaPedido,
    p_fecha_entrega: input.fechaEntrega,
    p_items: input.items.map((i) => ({ producto_id: i.productoId, cantidad: i.cantidad })) as unknown as Json,
    p_observaciones: input.observaciones ?? null,
  });
  if (error) throw error;
  return data as unknown as { id: string };
}

// E16-4: ratifica las cantidades producidas -- p_items tiene que cubrir TODOS los productos ya
// planificados (la función lo valida), y puede incluir productos nuevos no planificados.
export async function completarProduccion(
  supabase: SupabaseClient<Database>,
  produccionId: string,
  items: CompletarProduccionItemInput[],
): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc("completar_produccion", {
    p_produccion_id: produccionId,
    p_items: items.map((i) => ({
      producto_id: i.productoId,
      cantidad_producida: i.cantidadProducida,
    })) as unknown as Json,
  });
  if (error) throw error;
  return data as unknown as { id: string };
}

export async function cancelarProduccion(
  supabase: SupabaseClient<Database>,
  produccionId: string,
): Promise<void> {
  const { error } = await supabase.rpc("cancelar_produccion", { p_produccion_id: produccionId });
  if (error) throw error;
}

export async function getProduccion(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Produccion | null> {
  const { data, error } = await supabase.from("producciones").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProduccionItems(
  supabase: SupabaseClient<Database>,
  produccionId: string,
): Promise<ProduccionItem[]> {
  const { data, error } = await supabase
    .from("produccion_items")
    .select("*")
    .eq("produccion_id", produccionId);
  if (error) throw error;
  return data;
}

export interface ProduccionConCantidadItems extends Produccion {
  cantidadItems: number;
}

// Dashboard (/admin): producción pendiente con entrega hasta `hasta` (incluye vencida, no solo
// futura -- mismo criterio que "Próximos pedidos a entregar", que tampoco oculta lo vencido, solo
// lo resalta) para verla toda de un vistazo y entrar directo a completarla. `cantidadItems` se
// resuelve aparte (sin `count` embebido: a esta escala, para el dashboard, alcanza con dos
// queries en vez de una vista/función nueva).
export async function listProduccionesPendientesHasta(
  supabase: SupabaseClient<Database>,
  { hasta }: { hasta: string },
): Promise<ProduccionConCantidadItems[]> {
  const { data: producciones, error } = await supabase
    .from("producciones")
    .select("*")
    .eq("estado", "pendiente")
    .lte("fecha_entrega", hasta)
    .order("fecha_entrega", { ascending: true });
  if (error) throw error;
  if (producciones.length === 0) return [];

  const { data: items, error: itemsError } = await supabase
    .from("produccion_items")
    .select("produccion_id")
    .in(
      "produccion_id",
      producciones.map((p) => p.id),
    );
  if (itemsError) throw itemsError;

  const cantidadPorProduccion = new Map<string, number>();
  for (const i of items) {
    cantidadPorProduccion.set(i.produccion_id, (cantidadPorProduccion.get(i.produccion_id) ?? 0) + 1);
  }

  return producciones.map((p) => ({ ...p, cantidadItems: cantidadPorProduccion.get(p.id) ?? 0 }));
}

export interface ListProduccionesPaginadoParams {
  page: number;
  pageSize: number;
  estado?: Produccion["estado"];
  sort?: { column: string; ascending: boolean };
}

// Listado paginado/ordenado server-side para el DataTable de /admin/produccion.
export async function listProduccionesPaginated(
  supabase: SupabaseClient<Database>,
  { page, pageSize, estado, sort }: ListProduccionesPaginadoParams,
): Promise<{ data: Produccion[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let request = supabase.from("producciones").select("*", { count: "exact" });
  if (estado) request = request.eq("estado", estado);
  request = sort
    ? request.order(sort.column, { ascending: sort.ascending })
    : request.order("fecha_entrega", { ascending: false });

  const { data, error, count } = await request.range(from, to);
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}
