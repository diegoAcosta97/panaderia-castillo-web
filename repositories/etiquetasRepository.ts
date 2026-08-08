import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type EtiquetaLote = Database["public"]["Tables"]["etiqueta_lotes"]["Row"];

export interface GenerarLoteInput {
  productoId: string;
  cantidad: number;
  fechaVencimiento: string | null;
}

export interface ResultadoGenerarLote {
  lote_id: string;
  cantidad: number;
  precio_impreso: number;
  fecha_vencimiento: string | null;
}

// E10-2: crea el lote y, si el producto controla stock, suma la cantidad al stock actual --
// todo en la función generar_lote_etiquetas (SECURITY DEFINER).
export async function generarLoteEtiquetas(
  supabase: SupabaseClient<Database>,
  input: GenerarLoteInput,
): Promise<ResultadoGenerarLote> {
  const { data, error } = await supabase.rpc("generar_lote_etiquetas", {
    p_producto_id: input.productoId,
    p_cantidad: input.cantidad,
    p_fecha_vencimiento: input.fechaVencimiento,
  });
  if (error) throw error;
  return data as unknown as ResultadoGenerarLote;
}
