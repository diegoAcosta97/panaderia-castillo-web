import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type ConfiguracionNegocio = Database["public"]["Tables"]["configuracion_negocio"]["Row"];

// Solo lectura por ahora -- la pantalla de edición es docs/backlog/12-configuracion.md#E12-1,
// que todavía no se construyó. E8-2 la necesita ya para leer mercadopago_external_pos_id.
export async function getConfiguracionNegocio(
  supabase: SupabaseClient<Database>,
): Promise<ConfiguracionNegocio> {
  const { data, error } = await supabase.from("configuracion_negocio").select("*").single();
  if (error) throw error;
  return data;
}
