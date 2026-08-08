import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type Gasto = Database["public"]["Tables"]["gastos"]["Row"];

export async function listGastosPorTurno(
  supabase: SupabaseClient<Database>,
  cajaTurnoId: string,
): Promise<Gasto[]> {
  const { data, error } = await supabase
    .from("gastos")
    .select("*")
    .eq("caja_turno_id", cajaTurnoId)
    .order("fecha", { ascending: false });
  if (error) throw error;
  return data;
}

export async function sumaGastosPorTurno(
  supabase: SupabaseClient<Database>,
  cajaTurnoId: string,
): Promise<number> {
  const gastos = await listGastosPorTurno(supabase, cajaTurnoId);
  return gastos.reduce((acc, g) => acc + Number(g.monto), 0);
}

export interface NuevoGasto {
  caja_turno_id: string;
  proveedor_id: string;
  concepto: string;
  monto: number;
  comprobante_url?: string | null;
}

export async function crearGasto(
  supabase: SupabaseClient<Database>,
  input: NuevoGasto,
): Promise<Gasto> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión.");

  const { data, error } = await supabase
    .from("gastos")
    .insert({ ...input, usuario_id: user.id })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// Admin (E5-5): reporte con filtros de proveedor y rango de fecha. Un cajero no llega acá (la
// RLS de gastos no le deja ver más que lo propio/turno abierto de todos modos).
export async function listGastos(
  supabase: SupabaseClient<Database>,
  filtros?: { proveedorId?: string; desde?: string; hasta?: string },
): Promise<Gasto[]> {
  let query = supabase.from("gastos").select("*").order("fecha", { ascending: false });

  if (filtros?.proveedorId) query = query.eq("proveedor_id", filtros.proveedorId);
  if (filtros?.desde) query = query.gte("fecha", filtros.desde);
  if (filtros?.hasta) query = query.lte("fecha", `${filtros.hasta}T23:59:59`);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export interface ListGastosPaginadoParams {
  page: number;
  pageSize: number;
  proveedorId?: string;
  desde?: string;
  hasta?: string;
  sort?: { column: string; ascending: boolean };
}

// Listado paginado/ordenado server-side para el DataTable de /admin/gastos (mismos filtros que
// listGastos, aplicados como builder calls en vez de leer searchParams).
export async function listGastosPaginated(
  supabase: SupabaseClient<Database>,
  { page, pageSize, proveedorId, desde, hasta, sort }: ListGastosPaginadoParams,
): Promise<{ data: Gasto[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let request = supabase.from("gastos").select("*", { count: "exact" });
  if (proveedorId) request = request.eq("proveedor_id", proveedorId);
  if (desde) request = request.gte("fecha", desde);
  if (hasta) request = request.lte("fecha", `${hasta}T23:59:59`);

  request = sort
    ? request.order(sort.column, { ascending: sort.ascending })
    : request.order("fecha", { ascending: false });

  const { data, error, count } = await request.range(from, to);
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

// Total de gastos que matchean los filtros vigentes, sin paginar -- usado para el resumen "Total:
// $X (N gastos)" debajo de la tabla, que debe reflejar todo el conjunto filtrado y no solo la
// página visible. Solo trae la columna monto (no todo el registro) para mantenerlo liviano.
export async function sumaGastosFiltrados(
  supabase: SupabaseClient<Database>,
  filtros?: { proveedorId?: string; desde?: string; hasta?: string },
): Promise<number> {
  let query = supabase.from("gastos").select("monto");

  if (filtros?.proveedorId) query = query.eq("proveedor_id", filtros.proveedorId);
  if (filtros?.desde) query = query.gte("fecha", filtros.desde);
  if (filtros?.hasta) query = query.lte("fecha", `${filtros.hasta}T23:59:59`);

  const { data, error } = await query;
  if (error) throw error;
  return data.reduce((acc, g) => acc + Number(g.monto), 0);
}
