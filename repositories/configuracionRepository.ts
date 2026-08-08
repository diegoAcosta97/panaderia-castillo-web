import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type ConfiguracionNegocio = Database["public"]["Tables"]["configuracion_negocio"]["Row"];

export async function getConfiguracionNegocio(
  supabase: SupabaseClient<Database>,
): Promise<ConfiguracionNegocio> {
  const { data, error } = await supabase.from("configuracion_negocio").select("*").single();
  if (error) throw error;
  return data;
}

// E12-1: escritura -- solo administrador (policy configuracion_negocio_update_admin, ver
// 20260808150000_configuracion_negocio_update_admin.sql).
export async function actualizarConfiguracionNegocio(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: Partial<Pick<ConfiguracionNegocio, "nombre_comercial" | "direccion" | "telefono" | "cuit">>,
): Promise<void> {
  const { error } = await supabase
    .from("configuracion_negocio")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
