import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TipoBeneficioOferta } from "@/types/database";

export type Oferta = Database["public"]["Tables"]["ofertas"]["Row"];
export type OfertaItem = Database["public"]["Tables"]["oferta_items"]["Row"];
export type OfertaConItems = Oferta & { items: OfertaItem[] };

export interface OfertaItemInput {
  producto_id: string;
  cantidad_requerida: number;
}

export interface OfertaInput {
  nombre: string;
  descripcion?: string | null;
  tipo_beneficio: TipoBeneficioOferta;
  valor_beneficio: number;
  max_aplicaciones_por_venta?: number | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  items: OfertaItemInput[];
}

const MIN_ITEMS_OFERTA = 2;

export async function listOfertas(
  supabase: SupabaseClient<Database>,
): Promise<OfertaConItems[]> {
  const { data: ofertas, error } = await supabase.from("ofertas").select("*").order("nombre");
  if (error) throw error;

  const { data: items, error: errorItems } = await supabase.from("oferta_items").select("*");
  if (errorItems) throw errorItems;

  return ofertas.map((oferta) => ({
    ...oferta,
    items: items.filter((item) => item.oferta_id === oferta.id),
  }));
}

export interface ListOfertasPaginadoParams {
  page: number;
  pageSize: number;
  sort?: { column: string; ascending: boolean };
}

// Listado paginado/ordenado server-side para el DataTable de /admin/ofertas. oferta_items se
// trae aparte (como en listOfertas) pero acotado a los ids de la página actual, no a todas las
// ofertas.
export async function listOfertasPaginated(
  supabase: SupabaseClient<Database>,
  { page, pageSize, sort }: ListOfertasPaginadoParams,
): Promise<{ data: OfertaConItems[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let request = supabase.from("ofertas").select("*", { count: "exact" });
  request = sort
    ? request.order(sort.column, { ascending: sort.ascending })
    : request.order("nombre");

  const { data: ofertas, error, count } = await request.range(from, to);
  if (error) throw error;
  if (!ofertas || ofertas.length === 0) return { data: [], count: count ?? 0 };

  const { data: items, error: errorItems } = await supabase
    .from("oferta_items")
    .select("*")
    .in(
      "oferta_id",
      ofertas.map((o) => o.id),
    );
  if (errorItems) throw errorItems;

  return {
    data: ofertas.map((oferta) => ({
      ...oferta,
      items: items.filter((item) => item.oferta_id === oferta.id),
    })),
    count: count ?? 0,
  };
}

function datosOferta(input: OfertaInput) {
  return {
    nombre: input.nombre,
    descripcion: input.descripcion ?? null,
    tipo_beneficio: input.tipo_beneficio,
    valor_beneficio: input.valor_beneficio,
    max_aplicaciones_por_venta: input.max_aplicaciones_por_venta ?? null,
    fecha_inicio: input.fecha_inicio ?? null,
    fecha_fin: input.fecha_fin ?? null,
  };
}

export async function crearOferta(
  supabase: SupabaseClient<Database>,
  input: OfertaInput,
): Promise<Oferta> {
  if (input.items.length < MIN_ITEMS_OFERTA) {
    throw new Error("Una oferta necesita al menos 2 productos (RF-2.1).");
  }

  const { data: oferta, error } = await supabase
    .from("ofertas")
    .insert(datosOferta(input))
    .select("*")
    .single();
  if (error) throw error;

  const { error: itemsError } = await supabase.from("oferta_items").insert(
    input.items.map((item) => ({
      oferta_id: oferta.id,
      producto_id: item.producto_id,
      cantidad_requerida: item.cantidad_requerida,
    })),
  );
  if (itemsError) throw itemsError;

  return oferta;
}

export async function actualizarOferta(
  supabase: SupabaseClient<Database>,
  id: string,
  input: OfertaInput,
): Promise<void> {
  if (input.items.length < MIN_ITEMS_OFERTA) {
    throw new Error("Una oferta necesita al menos 2 productos (RF-2.1).");
  }

  const { error } = await supabase.from("ofertas").update(datosOferta(input)).eq("id", id);
  if (error) throw error;

  // Reemplazo completo de items (más simple que un diff, y el volumen por oferta es chico).
  const { error: deleteError } = await supabase
    .from("oferta_items")
    .delete()
    .eq("oferta_id", id);
  if (deleteError) throw deleteError;

  const { error: itemsError } = await supabase.from("oferta_items").insert(
    input.items.map((item) => ({
      oferta_id: id,
      producto_id: item.producto_id,
      cantidad_requerida: item.cantidad_requerida,
    })),
  );
  if (itemsError) throw itemsError;
}

export async function actualizarOfertaActivo(
  supabase: SupabaseClient<Database>,
  id: string,
  activo: boolean,
): Promise<void> {
  const { error } = await supabase.from("ofertas").update({ activo }).eq("id", id);
  if (error) throw error;
}
