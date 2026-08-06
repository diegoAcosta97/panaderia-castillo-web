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
