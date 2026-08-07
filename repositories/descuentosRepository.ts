import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TipoCondicionDescuento, TipoEfectoDescuento } from "@/types/database";

export type Descuento = Database["public"]["Tables"]["descuentos"]["Row"];
export type DescuentoCondicion = Database["public"]["Tables"]["descuento_condiciones"]["Row"];
export type DescuentoConCondiciones = Descuento & { condiciones: DescuentoCondicion[] };

export interface CondicionInput {
  tipo_condicion: TipoCondicionDescuento;
  monto_minimo?: number | null;
  producto_id?: string | null;
  categoria_id?: string | null;
  cantidad_minima?: number | null;
}

export interface DescuentoInput {
  nombre: string;
  descripcion?: string | null;
  tipo_efecto: TipoEfectoDescuento;
  valor_efecto: number;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  condiciones: CondicionInput[];
}

export async function listDescuentos(
  supabase: SupabaseClient<Database>,
): Promise<DescuentoConCondiciones[]> {
  const { data: descuentos, error } = await supabase
    .from("descuentos")
    .select("*")
    .order("nombre");
  if (error) throw error;

  const { data: condiciones, error: errorCondiciones } = await supabase
    .from("descuento_condiciones")
    .select("*");
  if (errorCondiciones) throw errorCondiciones;

  return descuentos.map((descuento) => ({
    ...descuento,
    condiciones: condiciones.filter((c) => c.descuento_id === descuento.id),
  }));
}

function datosDescuento(input: DescuentoInput) {
  return {
    nombre: input.nombre,
    descripcion: input.descripcion ?? null,
    tipo_efecto: input.tipo_efecto,
    valor_efecto: input.valor_efecto,
    fecha_inicio: input.fecha_inicio ?? null,
    fecha_fin: input.fecha_fin ?? null,
  };
}

function datosCondicion(condicion: CondicionInput, descuentoId: string) {
  return {
    descuento_id: descuentoId,
    tipo_condicion: condicion.tipo_condicion,
    monto_minimo: condicion.tipo_condicion === "monto_minimo" ? (condicion.monto_minimo ?? null) : null,
    producto_id: condicion.tipo_condicion === "producto_incluido" ? (condicion.producto_id ?? null) : null,
    categoria_id:
      condicion.tipo_condicion === "categoria_incluida" ? (condicion.categoria_id ?? null) : null,
    cantidad_minima:
      condicion.tipo_condicion === "monto_minimo" ? null : (condicion.cantidad_minima ?? null),
  };
}

export async function crearDescuento(
  supabase: SupabaseClient<Database>,
  input: DescuentoInput,
): Promise<Descuento> {
  if (input.condiciones.length === 0) {
    throw new Error("Un descuento necesita al menos una condición (RF-3.2).");
  }

  const { data: descuento, error } = await supabase
    .from("descuentos")
    .insert(datosDescuento(input))
    .select("*")
    .single();
  if (error) throw error;

  const { error: condicionesError } = await supabase
    .from("descuento_condiciones")
    .insert(input.condiciones.map((c) => datosCondicion(c, descuento.id)));
  if (condicionesError) throw condicionesError;

  return descuento;
}

export async function actualizarDescuento(
  supabase: SupabaseClient<Database>,
  id: string,
  input: DescuentoInput,
): Promise<void> {
  if (input.condiciones.length === 0) {
    throw new Error("Un descuento necesita al menos una condición (RF-3.2).");
  }

  const { error } = await supabase.from("descuentos").update(datosDescuento(input)).eq("id", id);
  if (error) throw error;

  const { error: deleteError } = await supabase
    .from("descuento_condiciones")
    .delete()
    .eq("descuento_id", id);
  if (deleteError) throw deleteError;

  const { error: condicionesError } = await supabase
    .from("descuento_condiciones")
    .insert(input.condiciones.map((c) => datosCondicion(c, id)));
  if (condicionesError) throw condicionesError;
}

export async function actualizarDescuentoActivo(
  supabase: SupabaseClient<Database>,
  id: string,
  activo: boolean,
): Promise<void> {
  const { error } = await supabase.from("descuentos").update({ activo }).eq("id", id);
  if (error) throw error;
}
