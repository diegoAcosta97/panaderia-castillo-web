import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type PagoEmpleado = Database["public"]["Tables"]["pagos_empleados"]["Row"];

export async function listPagosEmpleadosPorTurno(
  supabase: SupabaseClient<Database>,
  cajaTurnoId: string,
): Promise<PagoEmpleado[]> {
  const { data, error } = await supabase
    .from("pagos_empleados")
    .select("*")
    .eq("caja_turno_id", cajaTurnoId)
    .order("fecha", { ascending: false });
  if (error) throw error;
  return data;
}

export async function sumaPagosEmpleadosPorTurno(
  supabase: SupabaseClient<Database>,
  cajaTurnoId: string,
): Promise<number> {
  const pagos = await listPagosEmpleadosPorTurno(supabase, cajaTurnoId);
  return pagos.reduce((acc, p) => acc + Number(p.monto), 0);
}

export interface NuevoPagoEmpleado {
  caja_turno_id: string;
  empleado_id: string;
  monto: number;
  periodo_desde: string;
  periodo_hasta: string;
  observaciones?: string | null;
}

export async function crearPagoEmpleado(
  supabase: SupabaseClient<Database>,
  input: NuevoPagoEmpleado,
): Promise<PagoEmpleado> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión.");

  const { data, error } = await supabase
    .from("pagos_empleados")
    .insert({ ...input, usuario_id: user.id })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// Admin: reporte con filtros de empleado y rango de fecha -- mismo criterio que
// gastosRepository#listGastos (un cajero no llega acá salvo por el propio turno abierto, ver
// RLS de pagos_empleados_select).
export async function listPagosEmpleados(
  supabase: SupabaseClient<Database>,
  filtros?: { empleadoId?: string; desde?: string; hasta?: string },
): Promise<PagoEmpleado[]> {
  let query = supabase.from("pagos_empleados").select("*").order("fecha", { ascending: false });

  if (filtros?.empleadoId) query = query.eq("empleado_id", filtros.empleadoId);
  if (filtros?.desde) query = query.gte("fecha", filtros.desde);
  if (filtros?.hasta) query = query.lte("fecha", `${filtros.hasta}T23:59:59`);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export interface ListPagosEmpleadosPaginadoParams {
  page: number;
  pageSize: number;
  empleadoId?: string;
  desde?: string;
  hasta?: string;
  sort?: { column: string; ascending: boolean };
}

export async function listPagosEmpleadosPaginated(
  supabase: SupabaseClient<Database>,
  { page, pageSize, empleadoId, desde, hasta, sort }: ListPagosEmpleadosPaginadoParams,
): Promise<{ data: PagoEmpleado[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let request = supabase.from("pagos_empleados").select("*", { count: "exact" });
  if (empleadoId) request = request.eq("empleado_id", empleadoId);
  if (desde) request = request.gte("fecha", desde);
  if (hasta) request = request.lte("fecha", `${hasta}T23:59:59`);

  request = sort
    ? request.order(sort.column, { ascending: sort.ascending })
    : request.order("fecha", { ascending: false });

  const { data, error, count } = await request.range(from, to);
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

// Total de pagos que matchean los filtros vigentes, sin paginar -- mismo criterio que
// gastosRepository#sumaGastosFiltrados.
export async function sumaPagosEmpleadosFiltrados(
  supabase: SupabaseClient<Database>,
  filtros?: { empleadoId?: string; desde?: string; hasta?: string },
): Promise<number> {
  let query = supabase.from("pagos_empleados").select("monto");

  if (filtros?.empleadoId) query = query.eq("empleado_id", filtros.empleadoId);
  if (filtros?.desde) query = query.gte("fecha", filtros.desde);
  if (filtros?.hasta) query = query.lte("fecha", `${filtros.hasta}T23:59:59`);

  const { data, error } = await query;
  if (error) throw error;
  return data.reduce((acc, p) => acc + Number(p.monto), 0);
}
