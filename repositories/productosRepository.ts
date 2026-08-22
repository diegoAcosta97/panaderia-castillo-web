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
  costo?: number | null;
  controla_stock: boolean;
  stock_minimo?: number | null;
  stock_inicial?: number | null;
  dias_vencimiento_default?: number | null;
}

const MAX_INTENTOS_CODIGO_BARRAS = 5;

export async function listProductos(
  supabase: SupabaseClient<Database>,
  filtros?: { categoriaId?: string; nombre?: string; activo?: boolean },
): Promise<Producto[]> {
  let request = supabase.from("productos").select("*");
  if (filtros?.categoriaId) request = request.eq("categoria_id", filtros.categoriaId);
  if (filtros?.nombre) request = request.ilike("nombre", `%${filtros.nombre}%`);
  if (filtros?.activo !== undefined) request = request.eq("activo", filtros.activo);

  const { data, error } = await request.order("nombre");
  if (error) throw error;
  return data;
}

export interface ListProductosPaginadoParams {
  page: number;
  pageSize: number;
  sort?: { column: string; ascending: boolean };
  categoriaId?: string;
  nombre?: string;
  activo?: boolean;
}

// Listado paginado/ordenado server-side para el DataTable de /admin/productos (mismo patrón que
// listBooksAdmin en biblioteca-liliana-bodoc-web).
export async function listProductosPaginated(
  supabase: SupabaseClient<Database>,
  { page, pageSize, sort, categoriaId, nombre, activo }: ListProductosPaginadoParams,
): Promise<{ data: Producto[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let request = supabase.from("productos").select("*", { count: "exact" });
  if (categoriaId) request = request.eq("categoria_id", categoriaId);
  if (nombre) request = request.ilike("nombre", `%${nombre}%`);
  if (activo !== undefined) request = request.eq("activo", activo);
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

// E11-2: productos elegibles para un conteo de stock -- solo los que controlan stock (RF-9.1),
// de la categoría elegida. Sin filtro de `activo`: un conteo físico cuenta lo que hay en el
// estante sin distinguir activo/inactivo.
export async function listProductosControlaStock(
  supabase: SupabaseClient<Database>,
  categoriaId?: string,
): Promise<Producto[]> {
  let request = supabase.from("productos").select("*").eq("controla_stock", true);
  if (categoriaId) request = request.eq("categoria_id", categoriaId);
  const { data, error } = await request.order("nombre");
  if (error) throw error;
  return data;
}

// E16-1: productos elegibles para armar una producción -- controlan stock (no tiene sentido
// "producir" algo que no lleva stock) y pertenecen a una categoría habilitada para producción
// (docs/backlog/16-produccion.md). Join embebido (mismo criterio que el filtro por medio de pago
// en listVentas) en vez de traer todo y filtrar en JS.
export async function listProductosParaProduccion(
  supabase: SupabaseClient<Database>,
): Promise<Producto[]> {
  const { data, error } = await supabase
    .from("productos")
    .select("*, categorias!inner(habilitada_produccion)")
    .eq("controla_stock", true)
    .eq("categorias.habilitada_produccion", true)
    .eq("activo", true)
    .order("nombre");
  if (error) throw error;
  return ((data ?? []) as (Producto & { categorias?: unknown })[]).map((row) => {
    const producto = { ...row };
    delete producto.categorias;
    return producto;
  });
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

// Despacho de un pedido por encargo (features/pedidos-encargo): trae los productos vigentes de
// una lista de ids en una sola query, para cargarlos al carrito con el precio del día.
export async function getProductosByIds(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<Producto[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("productos").select("*").in("id", ids);
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

// Si se carga stock inicial (> 0) al dar de alta el producto, se registra como movimiento
// 'alta_inicial' vía registrar_alta_inicial_stock (SECURITY DEFINER) -- ver
// docs/backlog/03-productos.md. Es una segunda llamada, no atómica con el insert: si falla,
// el producto ya quedó creado con stock_actual seteado pero sin el movimiento de auditoría; se
// prioriza no perder el alta del producto por un fallo en el registro del histórico.
async function registrarAltaInicialSiCorresponde(
  supabase: SupabaseClient<Database>,
  producto: Producto,
  stockInicial: number | null | undefined,
) {
  if (!producto.controla_stock || !stockInicial || stockInicial <= 0) return;
  const { error } = await supabase.rpc("registrar_alta_inicial_stock", {
    p_producto_id: producto.id,
    p_cantidad: stockInicial,
  });
  if (error) throw error;
}

export async function crearProducto(
  supabase: SupabaseClient<Database>,
  input: NuevoProducto,
): Promise<Producto> {
  const codigoManual = input.codigo_barras?.trim() || null;
  const stockActualInicial = input.controla_stock ? (input.stock_inicial ?? 0) : null;

  const base = {
    categoria_id: input.categoria_id,
    nombre: input.nombre,
    tipo_venta: input.tipo_venta,
    precio: input.precio,
    costo: input.costo ?? null,
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
    await registrarAltaInicialSiCorresponde(supabase, data, input.stock_inicial);
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

    if (!error) {
      await registrarAltaInicialSiCorresponde(supabase, data, input.stock_inicial);
      return data;
    }
    if (!isPostgresErrorCode(error, POSTGRES_UNIQUE_VIOLATION)) throw error;
  }

  throw new Error(
    "No se pudo generar un código de barras único tras varios intentos. Probá de nuevo.",
  );
}

export type ActualizarProductoPatch = Partial<
  Pick<
    Producto,
    | "nombre"
    | "categoria_id"
    | "codigo_barras"
    | "precio"
    | "costo"
    | "controla_stock"
    | "stock_minimo"
    | "dias_vencimiento_default"
    | "activo"
  >
> & {
  // Solo se manda al tildar "Controla stock" en un producto que antes no lo controlaba (RF-1.3):
  // stock_actual queda NULL mientras controla_stock es false (crearProducto), así que habilitarlo
  // sin pedir un stock inicial dejaba el producto en un estado que rompía confirmar_venta/
  // registrar_merma/registrar_consumo_interno -- ver 20260822090000_fix_stock_actual_null_constraint.
  // Ausente (no solo `undefined`) en cualquier otro caso, para no pisar el stock_actual de un
  // producto que ya lo tenía seteado.
  stock_inicial?: number;
};

export async function actualizarProducto(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: ActualizarProductoPatch,
): Promise<void> {
  const { stock_inicial, ...camposProducto } = patch;
  const habilitaControlStock = camposProducto.controla_stock === true && stock_inicial !== undefined;

  const { error } = await supabase
    .from("productos")
    .update({
      ...camposProducto,
      ...(habilitaControlStock ? { stock_actual: stock_inicial } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;

  if (habilitaControlStock && stock_inicial! > 0) {
    const { error: errorAlta } = await supabase.rpc("registrar_alta_inicial_stock", {
      p_producto_id: id,
      p_cantidad: stock_inicial,
    });
    if (errorAlta) throw errorAlta;
  }
}

// Borrado real (no desactivar): las FKs de renglones_venta/movimientos_stock/etc. rechazan el
// delete si el producto tiene cualquier historial relacionado -- ver nota en la migración
// productos_delete_admin. El caller traduce ese error (POSTGRES_FOREIGN_KEY_VIOLATION) a un
// mensaje claro para el usuario.
export async function eliminarProducto(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("productos").delete().eq("id", id);
  if (error) throw error;
}
