import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type Empleado = Database["public"]["Tables"]["empleados"]["Row"];

export async function listEmpleados(supabase: SupabaseClient<Database>): Promise<Empleado[]> {
  const { data, error } = await supabase.from("empleados").select("*").order("nombre");
  if (error) throw error;
  return data;
}

export async function getEmpleado(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Empleado> {
  const { data, error } = await supabase.from("empleados").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export interface ListEmpleadosPaginadoParams {
  page: number;
  pageSize: number;
  sort?: { column: string; ascending: boolean };
}

export async function listEmpleadosPaginated(
  supabase: SupabaseClient<Database>,
  { page, pageSize, sort }: ListEmpleadosPaginadoParams,
): Promise<{ data: Empleado[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let request = supabase.from("empleados").select("*", { count: "exact" });
  request = sort
    ? request.order(sort.column, { ascending: sort.ascending })
    : request.order("nombre");

  const { data, error, count } = await request.range(from, to);
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export interface NuevoEmpleado {
  nombre: string;
  tipo_cobro: Empleado["tipo_cobro"];
}

export async function crearEmpleado(
  supabase: SupabaseClient<Database>,
  input: NuevoEmpleado,
): Promise<Empleado> {
  const { data, error } = await supabase.from("empleados").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function actualizarEmpleado(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: Partial<Pick<Empleado, "nombre" | "tipo_cobro" | "activo">>,
): Promise<void> {
  const { error } = await supabase.from("empleados").update(patch).eq("id", id);
  if (error) throw error;
}
