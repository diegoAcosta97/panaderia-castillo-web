import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

export type PedidoEncargo = Database["public"]["Tables"]["pedidos_encargo"]["Row"];
export type PedidoEncargoItem = Database["public"]["Tables"]["pedido_encargo_items"]["Row"];
export type SenaPedido = Database["public"]["Tables"]["senas_pedidos"]["Row"];

export interface ItemPedidoInput {
  producto_id: string;
  cantidad: number;
}

export interface NuevoPedidoEncargo {
  clienteNombre: string;
  clienteTelefono: string | null;
  fechaEntrega: string;
  notas: string | null;
  items: ItemPedidoInput[];
}

// crear_pedido_encargo (SECURITY DEFINER) -- inserta el pedido y sus items en una sola
// transacción, evita un pedido huérfano sin items si el segundo insert fallara.
export async function crearPedidoEncargo(
  supabase: SupabaseClient<Database>,
  input: NuevoPedidoEncargo,
): Promise<string> {
  const { data, error } = await supabase.rpc("crear_pedido_encargo", {
    p_cliente_nombre: input.clienteNombre,
    p_cliente_telefono: input.clienteTelefono,
    p_fecha_entrega: input.fechaEntrega,
    p_notas: input.notas,
    p_items: input.items as unknown as Json,
  });
  if (error) throw error;
  return data as unknown as string;
}

export interface ResultadoRegistrarSena {
  sena_id: string;
  caja_turno_id: string;
}

// registrar_sena_pedido (SECURITY DEFINER) -- valida turno abierto y pedido pendiente, ata la
// seña al turno abierto (cerrar_turno la suma al efectivo esperado).
export async function registrarSenaPedido(
  supabase: SupabaseClient<Database>,
  pedidoId: string,
  monto: number,
): Promise<ResultadoRegistrarSena> {
  const { data, error } = await supabase.rpc("registrar_sena_pedido", {
    p_pedido_id: pedidoId,
    p_monto: monto,
  });
  if (error) throw error;
  return data as unknown as ResultadoRegistrarSena;
}

// Cancelar y marcar entregado son updates directos (RLS pedidos_encargo_update_authenticated):
// a diferencia de las señas, no hay invariante financiero que proteger acá.
export async function cancelarPedidoEncargo(
  supabase: SupabaseClient<Database>,
  pedidoId: string,
): Promise<void> {
  const { error } = await supabase
    .from("pedidos_encargo")
    .update({ estado: "cancelado" })
    .eq("id", pedidoId);
  if (error) throw error;
}

export async function marcarPedidoEntregado(
  supabase: SupabaseClient<Database>,
  pedidoId: string,
  ventaId: string,
): Promise<void> {
  const { error } = await supabase
    .from("pedidos_encargo")
    .update({ estado: "entregado", venta_id: ventaId })
    .eq("id", pedidoId);
  if (error) throw error;
}

export async function getItemsPedido(
  supabase: SupabaseClient<Database>,
  pedidoId: string,
): Promise<PedidoEncargoItem[]> {
  const { data, error } = await supabase
    .from("pedido_encargo_items")
    .select("*")
    .eq("pedido_id", pedidoId);
  if (error) throw error;
  return data;
}

export async function sumaSenasPorPedido(
  supabase: SupabaseClient<Database>,
  pedidoId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("senas_pedidos")
    .select("monto")
    .eq("pedido_id", pedidoId);
  if (error) throw error;
  return data.reduce((acc, s) => acc + Number(s.monto), 0);
}

export async function sumaSenasPorTurno(
  supabase: SupabaseClient<Database>,
  cajaTurnoId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("senas_pedidos")
    .select("monto")
    .eq("caja_turno_id", cajaTurnoId);
  if (error) throw error;
  return data.reduce((acc, s) => acc + Number(s.monto), 0);
}

export interface PedidoEncargoConDetalle extends PedidoEncargo {
  items: { producto_id: string; cantidad: number }[];
  sena_total: number;
}

export interface ListPedidosEncargoPaginadoParams {
  page: number;
  pageSize: number;
  estado?: PedidoEncargo["estado"];
  texto?: string;
  sort?: { column: string; ascending: boolean };
}

// Listado paginado/ordenado server-side para el DataTable de /pos/pedidos. `texto` busca por
// nombre o teléfono del cliente (ilike, sin acentos/mayúsculas exacto -- mismo criterio simple
// que buscarPorNombre en productosRepository). Items y señas se traen en dos queries aparte y se
// unen en JS (mismo criterio que el resto del repo, ej. sumaVentasEfectivoPorTurno) -- acotado a
// los ids de la página visible, no es un N+1 por fila. El total ($) se calcula en el cliente
// contra el precio vigente del producto (es una referencia, no lo que se va a cobrar el día de
// entrega).
export async function listPedidosEncargoPaginated(
  supabase: SupabaseClient<Database>,
  { page, pageSize, estado, texto, sort }: ListPedidosEncargoPaginadoParams,
): Promise<{ data: PedidoEncargoConDetalle[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let request = supabase.from("pedidos_encargo").select("*", { count: "exact" });
  if (estado) request = request.eq("estado", estado);
  if (texto) request = request.or(`cliente_nombre.ilike.%${texto}%,cliente_telefono.ilike.%${texto}%`);

  request = sort
    ? request.order(sort.column, { ascending: sort.ascending })
    : request.order("fecha_entrega", { ascending: true });

  const { data, error, count } = await request.range(from, to);
  if (error) throw error;
  const pedidos = data ?? [];
  if (pedidos.length === 0) return { data: [], count: count ?? 0 };

  const pedidoIds = pedidos.map((p) => p.id);
  const [{ data: items, error: itemsError }, { data: senas, error: senasError }] =
    await Promise.all([
      supabase.from("pedido_encargo_items").select("pedido_id, producto_id, cantidad").in(
        "pedido_id",
        pedidoIds,
      ),
      supabase.from("senas_pedidos").select("pedido_id, monto").in("pedido_id", pedidoIds),
    ]);
  if (itemsError) throw itemsError;
  if (senasError) throw senasError;

  const data2 = pedidos.map((pedido) => ({
    ...pedido,
    items: (items ?? [])
      .filter((i) => i.pedido_id === pedido.id)
      .map((i) => ({ producto_id: i.producto_id, cantidad: Number(i.cantidad) })),
    sena_total: (senas ?? [])
      .filter((s) => s.pedido_id === pedido.id)
      .reduce((acc, s) => acc + Number(s.monto), 0),
  }));

  return { data: data2, count: count ?? 0 };
}

// Pedidos pendiente para el buscador de "Cargar pedido" en el POS -- sin paginar, acotado por
// texto (nombre/teléfono).
export async function buscarPedidosPendientes(
  supabase: SupabaseClient<Database>,
  texto: string,
): Promise<PedidoEncargo[]> {
  const { data, error } = await supabase
    .from("pedidos_encargo")
    .select("*")
    .eq("estado", "pendiente")
    .or(`cliente_nombre.ilike.%${texto}%,cliente_telefono.ilike.%${texto}%`)
    .order("fecha_entrega", { ascending: true })
    .limit(20);
  if (error) throw error;
  return data;
}
