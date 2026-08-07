import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type Gasto = Database["public"]["Tables"]["gastos"]["Row"];

export async function listGastosPorTurno(
  supabase: SupabaseClient<Database>,
  cajaTurnoId: string,
): Promise<Gasto[]> {
  const { data, error } = await supabase
    .from("gastos")
    .select("*")
    .eq("caja_turno_id", cajaTurnoId)
    .order("fecha", { ascending: false });
  if (error) throw error;
  return data;
}

export async function sumaGastosPorTurno(
  supabase: SupabaseClient<Database>,
  cajaTurnoId: string,
): Promise<number> {
  const gastos = await listGastosPorTurno(supabase, cajaTurnoId);
  return gastos.reduce((acc, g) => acc + Number(g.monto), 0);
}

export interface NuevoGasto {
  caja_turno_id: string;
  proveedor_id: string;
  concepto: string;
  monto: number;
  comprobante_url?: string | null;
}

export async function crearGasto(
  supabase: SupabaseClient<Database>,
  input: NuevoGasto,
): Promise<Gasto> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión.");

  const { data, error } = await supabase
    .from("gastos")
    .insert({ ...input, usuario_id: user.id })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// Admin (E5-5): reporte con filtros de proveedor y rango de fecha. Un cajero no llega acá (la
// RLS de gastos no le deja ver más que lo propio/turno abierto de todos modos).
export async function listGastos(
  supabase: SupabaseClient<Database>,
  filtros?: { proveedorId?: string; desde?: string; hasta?: string },
): Promise<Gasto[]> {
  let query = supabase.from("gastos").select("*").order("fecha", { ascending: false });

  if (filtros?.proveedorId) query = query.eq("proveedor_id", filtros.proveedorId);
  if (filtros?.desde) query = query.gte("fecha", filtros.desde);
  if (filtros?.hasta) query = query.lte("fecha", `${filtros.hasta}T23:59:59`);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}
