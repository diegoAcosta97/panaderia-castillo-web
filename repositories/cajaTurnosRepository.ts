import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { isPostgresErrorCode, POSTGRES_UNIQUE_VIOLATION } from "@/lib/errors";

export type CajaTurno = Database["public"]["Tables"]["caja_turnos"]["Row"];

export async function getTurnoAbierto(
  supabase: SupabaseClient<Database>,
): Promise<CajaTurno | null> {
  const { data, error } = await supabase
    .from("caja_turnos")
    .select("*")
    .eq("estado", "abierta")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function abrirTurno(
  supabase: SupabaseClient<Database>,
  montoApertura: number,
  etiquetaTurno: string | null,
): Promise<CajaTurno> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión.");

  const { data, error } = await supabase
    .from("caja_turnos")
    .insert({
      usuario_apertura_id: user.id,
      monto_apertura: montoApertura,
      etiqueta_turno: etiquetaTurno,
    })
    .select("*")
    .single();

  if (error) {
    if (isPostgresErrorCode(error, POSTGRES_UNIQUE_VIOLATION)) {
      throw new Error("Ya hay un turno de caja abierto.");
    }
    throw error;
  }
  return data;
}

// E13-1: cierra vía cerrar_turno (SECURITY DEFINER) -- calcula efectivo_esperado server-side a
// partir de las ventas/gastos reales del turno, nunca confía en un valor mandado por el
// cliente (antes era un update directo con with check(true), forjable por API). Ver
// 20260808220005_create_cerrar_turno_function.sql.
export async function cerrarTurno(
  supabase: SupabaseClient<Database>,
  id: string,
  montoCierreDeclarado: number,
  observaciones: string | null,
): Promise<CajaTurno> {
  const { data, error } = await supabase.rpc("cerrar_turno", {
    p_turno_id: id,
    p_monto_cierre_declarado: montoCierreDeclarado,
    p_observaciones: observaciones,
  });
  if (error) throw error;
  return data as unknown as CajaTurno;
}

// Admin-only por RLS (docs/backlog/04-caja.md#E4-4) — un cajero solo ve el turno abierto y los
// propios vía la policy caja_turnos_select, esta función devolvería un subconjunto parcial si
// la llamara.
export async function listTurnos(
  supabase: SupabaseClient<Database>,
  filtros?: { desde?: string; hasta?: string },
): Promise<CajaTurno[]> {
  let query = supabase
    .from("caja_turnos")
    .select("*")
    .order("fecha_apertura", { ascending: false });

  if (filtros?.desde) query = query.gte("fecha", filtros.desde);
  if (filtros?.hasta) query = query.lte("fecha", filtros.hasta);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}
