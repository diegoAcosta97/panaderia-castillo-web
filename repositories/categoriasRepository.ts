import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type Categoria = Database["public"]["Tables"]["categorias"]["Row"];

export async function listCategorias(
  supabase: SupabaseClient<Database>,
): Promise<Categoria[]> {
  const { data, error } = await supabase.from("categorias").select("*").order("nombre");
  if (error) throw error;
  return data;
}

export interface ListCategoriasPaginadoParams {
  page: number;
  pageSize: number;
  sort?: { column: string; ascending: boolean };
}

export async function listCategoriasPaginated(
  supabase: SupabaseClient<Database>,
  { page, pageSize, sort }: ListCategoriasPaginadoParams,
): Promise<{ data: Categoria[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let request = supabase.from("categorias").select("*", { count: "exact" });
  request = sort
    ? request.order(sort.column, { ascending: sort.ascending })
    : request.order("nombre");

  const { data, error, count } = await request.range(from, to);
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function crearCategoria(
  supabase: SupabaseClient<Database>,
  nombre: string,
): Promise<Categoria> {
  const { data, error } = await supabase
    .from("categorias")
    .insert({ nombre })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function actualizarCategoria(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: Partial<Pick<Categoria, "nombre" | "activo">>,
): Promise<void> {
  const { error } = await supabase.from("categorias").update(patch).eq("id", id);
  if (error) throw error;
}
