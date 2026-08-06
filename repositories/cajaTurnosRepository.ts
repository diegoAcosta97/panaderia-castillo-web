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

export async function cerrarTurno(
  supabase: SupabaseClient<Database>,
  id: string,
  montoCierreDeclarado: number,
  efectivoEsperado: number,
  observaciones: string | null,
): Promise<CajaTurno> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión.");

  const { data, error } = await supabase
    .from("caja_turnos")
    .update({
      usuario_cierre_id: user.id,
      monto_cierre_declarado: montoCierreDeclarado,
      efectivo_esperado: efectivoEsperado,
      diferencia: montoCierreDeclarado - efectivoEsperado,
      fecha_cierre: new Date().toISOString(),
      estado: "cerrada",
      observaciones,
    })
    .eq("id", id)
    .eq("estado", "abierta")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Este turno ya no está abierto (puede que ya lo hayan cerrado).");
  }
  return data;
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
