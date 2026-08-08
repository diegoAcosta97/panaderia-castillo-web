import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type Perfil = Database["public"]["Tables"]["perfiles"]["Row"];

export async function getOwnProfile(
  supabase: SupabaseClient<Database>,
): Promise<Perfil | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) return null;
  return data;
}

// Requiere la policy "perfiles_select_admin" (docs/backlog/02-roles.md#E2-4) — con un `perfil`
// que no sea administrador, RLS filtra todo salvo el propio.
export async function listPerfiles(
  supabase: SupabaseClient<Database>,
): Promise<Perfil[]> {
  const { data, error } = await supabase
    .from("perfiles")
    .select("*")
    .order("created_at");

  if (error) throw error;
  return data;
}

export interface ListPerfilesPaginadoParams {
  page: number;
  pageSize: number;
  sort?: { column: string; ascending: boolean };
}

export async function listPerfilesPaginated(
  supabase: SupabaseClient<Database>,
  { page, pageSize, sort }: ListPerfilesPaginadoParams,
): Promise<{ data: Perfil[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let request = supabase.from("perfiles").select("*", { count: "exact" });
  request = sort
    ? request.order(sort.column, { ascending: sort.ascending })
    : request.order("created_at");

  const { data, error, count } = await request.range(from, to);
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

// E13-1: rol/activo ya no son columnas editables por update directo (revoke a nivel Postgres,
// ver 20260808220000_fix_perfiles_self_escalation.sql -- un cajero podía auto-promoverse antes
// de este fix) -- pasan por actualizar_rol_perfil (SECURITY DEFINER, gated por
// is_administrador()). nombre_completo sigue siendo un update directo normal, protegido por RLS
// (perfiles_update_own/perfiles_update_admin).
export async function updatePerfil(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: Partial<Pick<Perfil, "rol" | "activo" | "nombre_completo">>,
): Promise<void> {
  if (patch.rol !== undefined || patch.activo !== undefined) {
    const { error } = await supabase.rpc("actualizar_rol_perfil", {
      p_id: id,
      p_rol: patch.rol ?? null,
      p_activo: patch.activo ?? null,
    });
    if (error) throw error;
  }

  if (patch.nombre_completo !== undefined) {
    const { error } = await supabase
      .from("perfiles")
      .update({ nombre_completo: patch.nombre_completo })
      .eq("id", id);
    if (error) throw error;
  }
}
