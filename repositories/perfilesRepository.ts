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

export async function updatePerfil(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: Partial<Pick<Perfil, "rol" | "activo" | "nombre_completo">>,
): Promise<void> {
  const { error } = await supabase.from("perfiles").update(patch).eq("id", id);
  if (error) throw error;
}
