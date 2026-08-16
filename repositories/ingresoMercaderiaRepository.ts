import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type IngresoMercaderia = Database["public"]["Tables"]["ingresos_mercaderia"]["Row"];
export type IngresoMercaderiaItem =
  Database["public"]["Tables"]["ingreso_mercaderia_items"]["Row"];

export interface IngresoMercaderiaItemInput {
  productoId: string;
  cantidad: number;
}

export interface ResultadoIngresoMercaderia {
  id: string;
  estado: IngresoMercaderia["estado"];
}

// E15-3: crear_ingreso_mercaderia es SECURITY DEFINER -- cualquier autenticado puede llamarla.
// Si quien llama es administrador, queda `aprobado` e impacta stock en el mismo paso; si es
// cajero, queda `pendiente_aprobacion` sin tocar stock (docs/backlog/15-ingreso-mercaderia.md#E15-3).
export async function crearIngresoMercaderia(
  supabase: SupabaseClient<Database>,
  items: IngresoMercaderiaItemInput[],
  observaciones: string | null,
): Promise<ResultadoIngresoMercaderia> {
  const { data, error } = await supabase.rpc("crear_ingreso_mercaderia", {
    p_items: items.map((i) => ({ producto_id: i.productoId, cantidad: i.cantidad })),
    p_observaciones: observaciones,
  });
  if (error) throw error;
  return data as unknown as ResultadoIngresoMercaderia;
}

// E15-4: única vía para ajustar stock a partir de un ingreso cargado por un cajero -- función
// SECURITY DEFINER, nunca automático.
export async function aprobarIngresoMercaderia(
  supabase: SupabaseClient<Database>,
  ingresoMercaderiaId: string,
  aprobadorId: string,
): Promise<void> {
  const { error } = await supabase.rpc("aprobar_ingreso_mercaderia", {
    p_ingreso_mercaderia_id: ingresoMercaderiaId,
    p_aprobador_id: aprobadorId,
  });
  if (error) throw error;
}

// E15-4: rechazar no toca stock.
export async function rechazarIngresoMercaderia(
  supabase: SupabaseClient<Database>,
  ingresoMercaderiaId: string,
  aprobadorId: string,
): Promise<void> {
  const { error } = await supabase.rpc("rechazar_ingreso_mercaderia", {
    p_ingreso_mercaderia_id: ingresoMercaderiaId,
    p_aprobador_id: aprobadorId,
  });
  if (error) throw error;
}

export async function getIngresoMercaderia(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<IngresoMercaderia | null> {
  const { data, error } = await supabase
    .from("ingresos_mercaderia")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getItemsIngresoMercaderia(
  supabase: SupabaseClient<Database>,
  ingresoMercaderiaId: string,
): Promise<IngresoMercaderiaItem[]> {
  const { data, error } = await supabase
    .from("ingreso_mercaderia_items")
    .select("*")
    .eq("ingreso_mercaderia_id", ingresoMercaderiaId);
  if (error) throw error;
  return data;
}

export async function listIngresosMercaderia(
  supabase: SupabaseClient<Database>,
): Promise<IngresoMercaderia[]> {
  const { data, error } = await supabase
    .from("ingresos_mercaderia")
    .select("*")
    .order("fecha", { ascending: false });
  if (error) throw error;
  return data;
}

export interface ListIngresosMercaderiaPaginadoParams {
  page: number;
  pageSize: number;
  sort?: { column: string; ascending: boolean };
}

// Listado paginado/ordenado server-side para el DataTable de /admin/ingresos-mercaderia.
export async function listIngresosMercaderiaPaginated(
  supabase: SupabaseClient<Database>,
  { page, pageSize, sort }: ListIngresosMercaderiaPaginadoParams,
): Promise<{ data: IngresoMercaderia[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let request = supabase.from("ingresos_mercaderia").select("*", { count: "exact" });
  request = sort
    ? request.order(sort.column, { ascending: sort.ascending })
    : request.order("fecha", { ascending: false });

  const { data, error, count } = await request.range(from, to);
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}
