import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type Proveedor = Database["public"]["Tables"]["proveedores"]["Row"];

export async function listProveedores(
  supabase: SupabaseClient<Database>,
): Promise<Proveedor[]> {
  const { data, error } = await supabase.from("proveedores").select("*").order("nombre");
  if (error) throw error;
  return data;
}

export interface ListProveedoresPaginadoParams {
  page: number;
  pageSize: number;
  sort?: { column: string; ascending: boolean };
}

export async function listProveedoresPaginated(
  supabase: SupabaseClient<Database>,
  { page, pageSize, sort }: ListProveedoresPaginadoParams,
): Promise<{ data: Proveedor[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let request = supabase.from("proveedores").select("*", { count: "exact" });
  request = sort
    ? request.order(sort.column, { ascending: sort.ascending })
    : request.order("nombre");

  const { data, error, count } = await request.range(from, to);
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export interface NuevoProveedor {
  nombre: string;
  cuit?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
}

export async function crearProveedor(
  supabase: SupabaseClient<Database>,
  input: NuevoProveedor,
): Promise<Proveedor> {
  const { data, error } = await supabase
    .from("proveedores")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function actualizarProveedor(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: Partial<Pick<Proveedor, "nombre" | "cuit" | "telefono" | "email" | "direccion" | "activo">>,
): Promise<void> {
  const { error } = await supabase.from("proveedores").update(patch).eq("id", id);
  if (error) throw error;
}
