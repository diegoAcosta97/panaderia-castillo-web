import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TipoVentaProducto } from "@/types/database";
import { generarCodigoBarrasInterno } from "@/lib/barcode";
import { isPostgresErrorCode, POSTGRES_UNIQUE_VIOLATION } from "@/lib/errors";

export type Producto = Database["public"]["Tables"]["productos"]["Row"];

export interface NuevoProducto {
  categoria_id: string;
  nombre: string;
  codigo_barras?: string | null;
  tipo_venta: TipoVentaProducto;
  precio: number;
  controla_stock: boolean;
  stock_minimo?: number | null;
  dias_vencimiento_default?: number | null;
}

const MAX_INTENTOS_CODIGO_BARRAS = 5;

export async function listProductos(
  supabase: SupabaseClient<Database>,
): Promise<Producto[]> {
  const { data, error } = await supabase.from("productos").select("*").order("nombre");
  if (error) throw error;
  return data;
}

export interface ListProductosPaginadoParams {
  page: number;
  pageSize: number;
  sort?: { column: string; ascending: boolean };
}

// Listado paginado/ordenado server-side para el DataTable de /admin/productos (mismo patrón que
// listBooksAdmin en biblioteca-liliana-bodoc-web).
export async function listProductosPaginated(
  supabase: SupabaseClient<Database>,
  { page, pageSize, sort }: ListProductosPaginadoParams,
): Promise<{ data: Producto[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let request = supabase.from("productos").select("*", { count: "exact" });
  request = sort
    ? request.order(sort.column, { ascending: sort.ascending })
    : request.order("nombre");

  const { data, error, count } = await request.range(from, to);
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

// RF-1.4: "por debajo del mínimo" se calcula en el cliente (comparar dos columnas de la misma
// fila no es un filtro que PostgREST resuelva con un valor literal) — a este volumen de
// catálogo no hace falta una vista/función solo para esto.
export async function listProductosBajoStock(
  supabase: SupabaseClient<Database>,
): Promise<Producto[]> {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("controla_stock", true)
    .not("stock_minimo", "is", null)
    .order("nombre");
  if (error) throw error;
  return data.filter((p) => p.stock_actual !== null && p.stock_actual < p.stock_minimo!);
}

// E11-2: productos elegibles para un conteo de stock -- solo los que controlan stock (RF-9.1).
export async function listProductosControlaStock(
  supabase: SupabaseClient<Database>,
): Promise<Producto[]> {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("controla_stock", true)
    .order("nombre");
  if (error) throw error;
  return data;
}

export async function buscarPorCodigoBarras(
  supabase: SupabaseClient<Database>,
  codigoBarras: string,
): Promise<Producto | null> {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("codigo_barras", codigoBarras)
    .eq("activo", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function buscarPorNombre(
  supabase: SupabaseClient<Database>,
  texto: string,
): Promise<Producto[]> {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .ilike("nombre", `%${texto}%`)
    .eq("activo", true)
    .order("nombre")
    .limit(20);
  if (error) throw error;
  return data;
}

export async function crearProducto(
  supabase: SupabaseClient<Database>,
  input: NuevoProducto,
): Promise<Producto> {
  const codigoManual = input.codigo_barras?.trim() || null;
  const stockActualInicial = input.controla_stock ? 0 : null;

  const base = {
    categoria_id: input.categoria_id,
    nombre: input.nombre,
    tipo_venta: input.tipo_venta,
    precio: input.precio,
    controla_stock: input.controla_stock,
    stock_actual: stockActualInicial,
    stock_minimo: input.controla_stock ? (input.stock_minimo ?? null) : null,
    dias_vencimiento_default: input.dias_vencimiento_default ?? null,
  };

  if (codigoManual) {
    const { data, error } = await supabase
      .from("productos")
      .insert({ ...base, codigo_barras: codigoManual })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  // Sin código manual: se genera uno interno, reintentando si por azar colisiona con uno
  // existente (constraint unique en codigo_barras).
  for (let intento = 0; intento < MAX_INTENTOS_CODIGO_BARRAS; intento++) {
    const { data, error } = await supabase
      .from("productos")
      .insert({ ...base, codigo_barras: generarCodigoBarrasInterno() })
      .select("*")
      .single();

    if (!error) return data;
    if (!isPostgresErrorCode(error, POSTGRES_UNIQUE_VIOLATION)) throw error;
  }

  throw new Error(
    "No se pudo generar un código de barras único tras varios intentos. Probá de nuevo.",
  );
}

export async function actualizarProducto(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: Partial<
    Pick<
      Producto,
      | "nombre"
      | "categoria_id"
      | "codigo_barras"
      | "precio"
      | "controla_stock"
      | "stock_minimo"
      | "dias_vencimiento_default"
      | "activo"
    >
  >,
): Promise<void> {
  const { error } = await supabase
    .from("productos")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
