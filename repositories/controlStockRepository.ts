import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type ControlStock = Database["public"]["Tables"]["controles_stock"]["Row"];
export type ControlStockDetalle = Database["public"]["Tables"]["control_stock_detalles"]["Row"];

export interface DetalleInput {
  productoId: string;
  stockSistema: number;
  stockContado: number;
}

// E11-2: crea el control (arranca en_progreso, RLS en controles_stock_insert_admin exige que
// usuario_id = auth.uid()) -- el primer paso de "iniciar" un conteo.
export async function crearControlStock(
  supabase: SupabaseClient<Database>,
  usuarioId: string,
): Promise<ControlStock> {
  const { data, error } = await supabase
    .from("controles_stock")
    .insert({ usuario_id: usuarioId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// E11-2: carga los detalles contados -- solo entra mientras el control sigue en_progreso (RLS
// control_stock_detalles_insert_admin), y solo para productos con controla_stock = true.
export async function insertarDetalles(
  supabase: SupabaseClient<Database>,
  controlStockId: string,
  detalles: DetalleInput[],
): Promise<void> {
  if (detalles.length === 0) return;
  const { error } = await supabase.from("control_stock_detalles").insert(
    detalles.map((d) => ({
      control_stock_id: controlStockId,
      producto_id: d.productoId,
      stock_sistema: d.stockSistema,
      stock_contado: d.stockContado,
    })),
  );
  if (error) throw error;
}

// E11-2: cierra la carga -- pasa a pendiente_aprobacion (RLS controles_stock_update_admin
// permite exactamente esta transición). El ajuste de stock_actual NUNCA ocurre acá.
export async function cerrarControlStock(
  supabase: SupabaseClient<Database>,
  id: string,
  observaciones: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("controles_stock")
    .update({ estado: "pendiente_aprobacion", fecha_cierre: new Date().toISOString(), observaciones })
    .eq("id", id);
  if (error) throw error;
}

export async function getControlStock(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<ControlStock | null> {
  const { data, error } = await supabase
    .from("controles_stock")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDetallesControlStock(
  supabase: SupabaseClient<Database>,
  controlStockId: string,
): Promise<ControlStockDetalle[]> {
  const { data, error } = await supabase
    .from("control_stock_detalles")
    .select("*")
    .eq("control_stock_id", controlStockId);
  if (error) throw error;
  return data;
}

// E11-5: historial completo, más reciente primero.
export async function listControlesStock(
  supabase: SupabaseClient<Database>,
): Promise<ControlStock[]> {
  const { data, error } = await supabase
    .from("controles_stock")
    .select("*")
    .order("fecha_inicio", { ascending: false });
  if (error) throw error;
  return data;
}

// E11-5: todos los detalles con diferencia != 0 de todos los controles -- usado para armar el
// historial de diferencias recurrentes por producto en el listado.
export async function listDetallesConDiferencia(
  supabase: SupabaseClient<Database>,
): Promise<ControlStockDetalle[]> {
  const { data, error } = await supabase
    .from("control_stock_detalles")
    .select("*")
    .neq("diferencia", 0);
  if (error) throw error;
  return data;
}

// E11-3: única vía para ajustar stock_actual a partir de un conteo -- función SECURITY DEFINER,
// nunca automático (docs/backlog/11-control-stock.md#E11-3).
export async function aprobarControlStock(
  supabase: SupabaseClient<Database>,
  controlStockId: string,
  aprobadorId: string,
): Promise<void> {
  const { error } = await supabase.rpc("aprobar_control_stock", {
    p_control_stock_id: controlStockId,
    p_aprobador_id: aprobadorId,
  });
  if (error) throw error;
}

// E11-4: rechazar no toca stock -- update de una sola fila gated por la policy
// controles_stock_update_admin (pendiente_aprobacion -> rechazado), sin función SECURITY
// DEFINER.
export async function rechazarControlStock(
  supabase: SupabaseClient<Database>,
  controlStockId: string,
  aprobadorId: string,
): Promise<void> {
  const { error } = await supabase
    .from("controles_stock")
    .update({
      estado: "rechazado",
      usuario_aprobador_id: aprobadorId,
      fecha_aprobacion: new Date().toISOString(),
    })
    .eq("id", controlStockId);
  if (error) throw error;
}
