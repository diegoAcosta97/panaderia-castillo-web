import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TipoMovimientoStock } from "@/types/database";

export type MovimientoStock = Database["public"]["Tables"]["movimientos_stock"]["Row"];

export interface RegistrarMermaInput {
  productoId: string;
  cantidad: number;
  motivo: string;
}

export interface ResultadoMovimientoStock {
  movimiento_id: string;
  stock_resultante: number;
}

// E14-2: registrar_merma es SECURITY DEFINER -- bloquea el producto, valida stock suficiente y
// motivo no vacío, descuenta stock y deja el movimiento con tipo = 'merma'. Sin gate de admin:
// cualquier autenticado puede llamarla (docs/backlog/14-mermas-consumo-interno.md#E14-2).
export async function registrarMerma(
  supabase: SupabaseClient<Database>,
  input: RegistrarMermaInput,
): Promise<ResultadoMovimientoStock> {
  const { data, error } = await supabase.rpc("registrar_merma", {
    p_producto_id: input.productoId,
    p_cantidad: input.cantidad,
    p_motivo: input.motivo,
  });
  if (error) throw error;
  return data as unknown as ResultadoMovimientoStock;
}

export interface RegistrarConsumoInternoInput {
  productoId: string;
  cantidad: number;
  empleadoId: string | null;
  motivo: string;
}

// E14-3: mismo criterio que registrar_merma, con empleado_id opcional (permite "consumo del
// dueño / sin asignar" -- docs/backlog/14-mermas-consumo-interno.md#E14-3).
export async function registrarConsumoInterno(
  supabase: SupabaseClient<Database>,
  input: RegistrarConsumoInternoInput,
): Promise<ResultadoMovimientoStock> {
  const { data, error } = await supabase.rpc("registrar_consumo_interno", {
    p_producto_id: input.productoId,
    p_cantidad: input.cantidad,
    p_empleado_id: input.empleadoId,
    p_motivo: input.motivo,
  });
  if (error) throw error;
  return data as unknown as ResultadoMovimientoStock;
}

// Sibling sin paginar de listMovimientosStockPaginated, mismos filtros -- usado para exportar a
// CSV el conjunto filtrado completo (no solo la página visible).
export async function listMovimientosStock(
  supabase: SupabaseClient<Database>,
  filtros?: {
    tipo?: TipoMovimientoStock;
    productoId?: string;
    desde?: string;
    hasta?: string;
  },
): Promise<MovimientoStock[]> {
  let query = supabase.from("movimientos_stock").select("*").order("fecha", { ascending: false });

  if (filtros?.tipo) query = query.eq("tipo", filtros.tipo);
  if (filtros?.productoId) query = query.eq("producto_id", filtros.productoId);
  if (filtros?.desde) query = query.gte("fecha", filtros.desde);
  if (filtros?.hasta) query = query.lte("fecha", `${filtros.hasta}T23:59:59`);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export interface ListMovimientosStockPaginadoParams {
  page: number;
  pageSize: number;
  tipo?: TipoMovimientoStock;
  productoId?: string;
  desde?: string;
  hasta?: string;
  sort?: { column: string; ascending: boolean };
}

// E14-6: historial admin, todos los tipos de movimiento (RLS movimientos_stock_select_admin ya
// restringe el select a is_administrador() -- E3-3).
export async function listMovimientosStockPaginated(
  supabase: SupabaseClient<Database>,
  { page, pageSize, tipo, productoId, desde, hasta, sort }: ListMovimientosStockPaginadoParams,
): Promise<{ data: MovimientoStock[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let request = supabase.from("movimientos_stock").select("*", { count: "exact" });
  if (tipo) request = request.eq("tipo", tipo);
  if (productoId) request = request.eq("producto_id", productoId);
  if (desde) request = request.gte("fecha", desde);
  if (hasta) request = request.lte("fecha", `${hasta}T23:59:59`);

  request = sort
    ? request.order(sort.column, { ascending: sort.ascending })
    : request.order("fecha", { ascending: false });

  const { data, error, count } = await request.range(from, to);
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}
