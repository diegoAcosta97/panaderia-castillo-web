import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, MedioPago } from "@/types/database";

export type Venta = Database["public"]["Tables"]["ventas"]["Row"];
export type RenglonVenta = Database["public"]["Tables"]["renglones_venta"]["Row"];
export type VentaOfertaAplicada = Database["public"]["Tables"]["venta_ofertas_aplicadas"]["Row"];
export type VentaDescuentoAplicado =
  Database["public"]["Tables"]["venta_descuentos_aplicados"]["Row"];
export type VentaMedioPago = Database["public"]["Tables"]["venta_medios_pago"]["Row"];

export interface RenglonInput {
  producto_id: string;
  cantidad: number;
}

export interface OfertaAplicadaInput {
  oferta_id: string;
  veces_aplicada: number;
  monto_beneficio: number;
}

export interface DescuentoAplicadoInput {
  descuento_id: string;
  monto_aplicado: number;
}

export interface MedioPagoInput {
  medio_pago: MedioPago;
  monto: number;
}

export interface ConfirmarVentaInput {
  cajaTurnoId: string;
  renglones: RenglonInput[];
  ofertas: OfertaAplicadaInput[];
  descuentos: DescuentoAplicadoInput[];
  mediosPago: MedioPagoInput[];
}

export interface ConfirmarVentaResultado {
  venta_id: string;
  numero_comprobante: number;
  estado: Venta["estado"];
}

// Toda la escritura pasa por la función confirmar_venta (SECURITY DEFINER,
// docs/backlog/07-punto-de-venta.md#E7-3) — atómica, valida stock y arma venta + renglones +
// beneficios + medios de pago en una sola transacción.
export async function confirmarVenta(
  supabase: SupabaseClient<Database>,
  input: ConfirmarVentaInput,
): Promise<ConfirmarVentaResultado> {
  const { data, error } = await supabase.rpc("confirmar_venta", {
    p_caja_turno_id: input.cajaTurnoId,
    p_renglones: input.renglones as unknown as Json,
    p_ofertas: input.ofertas as unknown as Json,
    p_descuentos: input.descuentos as unknown as Json,
    p_medios_pago: input.mediosPago as unknown as Json,
  });
  if (error) throw error;
  return data as unknown as ConfirmarVentaResultado;
}

export async function getVenta(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Venta | null> {
  const { data, error } = await supabase.from("ventas").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRenglonesVenta(
  supabase: SupabaseClient<Database>,
  ventaId: string,
): Promise<RenglonVenta[]> {
  const { data, error } = await supabase
    .from("renglones_venta")
    .select("*")
    .eq("venta_id", ventaId);
  if (error) throw error;
  return data;
}

export async function getMediosPagoVenta(
  supabase: SupabaseClient<Database>,
  ventaId: string,
): Promise<VentaMedioPago[]> {
  const { data, error } = await supabase
    .from("venta_medios_pago")
    .select("*")
    .eq("venta_id", ventaId);
  if (error) throw error;
  return data;
}

export async function getOfertasAplicadas(
  supabase: SupabaseClient<Database>,
  ventaId: string,
): Promise<VentaOfertaAplicada[]> {
  const { data, error } = await supabase
    .from("venta_ofertas_aplicadas")
    .select("*")
    .eq("venta_id", ventaId);
  if (error) throw error;
  return data;
}

export async function getDescuentosAplicados(
  supabase: SupabaseClient<Database>,
  ventaId: string,
): Promise<VentaDescuentoAplicado[]> {
  const { data, error } = await supabase
    .from("venta_descuentos_aplicados")
    .select("*")
    .eq("venta_id", ventaId);
  if (error) throw error;
  return data;
}

// E7-7: revierte stock y marca la venta como anulada. Solo administrador (chequeado dentro de
// la función — no hay policy de update para `ventas`, ver E7-1).
export async function anularVenta(
  supabase: SupabaseClient<Database>,
  ventaId: string,
  motivo: string,
): Promise<void> {
  const { error } = await supabase.rpc("anular_venta", {
    p_venta_id: ventaId,
    p_motivo: motivo,
  });
  if (error) throw error;
}

// E8-2: guarda la referencia de la orden de Mercado Pago en el medio de pago pendiente.
export async function registrarQrPago(
  supabase: SupabaseClient<Database>,
  ventaMedioPagoId: string,
  mpReferenciaExterna: string,
  mpPaymentId: string,
  mpOrdenId: string,
): Promise<void> {
  const { error } = await supabase.rpc("registrar_qr_pago", {
    p_venta_medio_pago_id: ventaMedioPagoId,
    p_mp_referencia_externa: mpReferenciaExterna,
    p_mp_payment_id: mpPaymentId,
    p_mp_orden_id: mpOrdenId,
  });
  if (error) throw error;
}

// QR estático (docs/backlog/08-mercadopago.md#E8-2): con una sola caja física solo puede haber
// una orden de Mercado Pago vigente a la vez -- esto chequea si ya hay una antes de generar otra
// (excluyendo la propia venta: confirmar_venta ya insertó su venta_medios_pago 'pendiente' antes
// de que se llegue a este chequeo).
export async function hayPagoMercadoPagoPendiente(
  supabase: SupabaseClient<Database>,
  ventaId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("hay_pago_mp_pendiente", {
    p_excluir_venta_id: ventaId,
  });
  if (error) throw error;
  return data as unknown as boolean;
}

export interface ResultadoCancelarVentaPendiente {
  mp_orden_id: string | null;
}

// Cancela una venta pendiente_pago que el cajero abandonó (el cliente no llegó a pagar) --
// libera la caja para la próxima venta. No requiere admin: a diferencia de anularVenta, acá no
// hay stock ni dinero que revertir.
export async function cancelarVentaPendiente(
  supabase: SupabaseClient<Database>,
  ventaId: string,
): Promise<ResultadoCancelarVentaPendiente> {
  const { data, error } = await supabase.rpc("cancelar_venta_pendiente", {
    p_venta_id: ventaId,
  });
  if (error) throw error;
  return data as unknown as ResultadoCancelarVentaPendiente;
}

export interface ResultadoProcesarPagoMP {
  ya_procesado?: boolean;
  acreditado?: boolean;
  venta_completada?: boolean;
  venta_id: string;
  numero_comprobante?: number;
}

// E8-3: la llama únicamente el webhook con el cliente admin (service_role) -- la función en sí
// revoca el permiso a `authenticated`, así que esto nunca funcionaría con la sesión de un
// usuario logueado, ni siquiera un administrador.
export async function procesarResultadoPagoMP(
  supabase: SupabaseClient<Database>,
  mpReferenciaExterna: string,
  mpPaymentId: string,
  acreditado: boolean,
): Promise<ResultadoProcesarPagoMP> {
  const { data, error } = await supabase.rpc("procesar_resultado_pago_mp", {
    p_mp_referencia_externa: mpReferenciaExterna,
    p_mp_payment_id: mpPaymentId,
    p_acreditado: acreditado,
  });
  if (error) throw error;
  return data as unknown as ResultadoProcesarPagoMP;
}

// E13-1: usado por la vista previa de "efectivo esperado" en /pos/caja/cierre
// (features/caja/services/arqueoService.ts) -- mismo cálculo que hace cerrar_turno
// server-side (SECURITY DEFINER, fuente de verdad real), esto es solo para mostrarle al cajero
// una estimación antes de confirmar. Solo cuenta ventas `completada`, mismo criterio que la
// función SQL (ver comentario en 20260808220005_create_cerrar_turno_function.sql).
export async function sumaVentasEfectivoPorTurno(
  supabase: SupabaseClient<Database>,
  cajaTurnoId: string,
): Promise<number> {
  const { data: ventas, error: ventasError } = await supabase
    .from("ventas")
    .select("id")
    .eq("caja_turno_id", cajaTurnoId)
    .eq("estado", "completada");
  if (ventasError) throw ventasError;
  if (ventas.length === 0) return 0;

  const { data: medios, error: mediosError } = await supabase
    .from("venta_medios_pago")
    .select("monto")
    .in(
      "venta_id",
      ventas.map((v) => v.id),
    )
    .eq("medio_pago", "efectivo");
  if (mediosError) throw mediosError;

  return medios.reduce((acc, m) => acc + Number(m.monto), 0);
}

// Admin (E7-8): historial completo. Un cajero solo vería lo suyo/turno abierto de todos modos
// (RLS de ventas_select, docs/backlog/07-punto-de-venta.md#E7-1).
export async function listVentas(
  supabase: SupabaseClient<Database>,
  filtros?: { cajaTurnoId?: string; desde?: string; hasta?: string },
): Promise<Venta[]> {
  let query = supabase.from("ventas").select("*").order("fecha", { ascending: false });

  if (filtros?.cajaTurnoId) query = query.eq("caja_turno_id", filtros.cajaTurnoId);
  if (filtros?.desde) query = query.gte("fecha", filtros.desde);
  if (filtros?.hasta) query = query.lte("fecha", `${filtros.hasta}T23:59:59`);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export interface ResumenVentasRango {
  totalVentas: number;
  cantidadVentas: number;
  margenBruto: number;
  renglonesConCosto: number;
  renglonesSinCosto: number;
}

// Dashboard (/admin): total vendido + margen bruto de un rango de fechas, agregado en JS a
// partir de listVentas + renglones_venta -- mismo criterio que sumaVentasEfectivoPorTurno (sin
// vista/RPC nueva a este volumen). Solo cuenta ventas completada, igual que el resto del
// sistema. El margen es "parcial" si hay renglones sin costo_unitario_snapshot cargado (producto
// sin costo al momento de la venta) -- se informa la cobertura, no se oculta.
export async function resumenVentasPorRango(
  supabase: SupabaseClient<Database>,
  { desde, hasta }: { desde: string; hasta: string },
): Promise<ResumenVentasRango> {
  const ventas = await listVentas(supabase, { desde, hasta });
  const completadas = ventas.filter((v) => v.estado === "completada");
  const totalVentas = completadas.reduce((acc, v) => acc + Number(v.total), 0);

  if (completadas.length === 0) {
    return {
      totalVentas: 0,
      cantidadVentas: 0,
      margenBruto: 0,
      renglonesConCosto: 0,
      renglonesSinCosto: 0,
    };
  }

  const { data: renglones, error } = await supabase
    .from("renglones_venta")
    .select("cantidad, subtotal, costo_unitario_snapshot")
    .in(
      "venta_id",
      completadas.map((v) => v.id),
    );
  if (error) throw error;

  let margenBruto = 0;
  let renglonesConCosto = 0;
  let renglonesSinCosto = 0;
  for (const r of renglones) {
    if (r.costo_unitario_snapshot != null) {
      margenBruto += Number(r.subtotal) - Number(r.costo_unitario_snapshot) * Number(r.cantidad);
      renglonesConCosto++;
    } else {
      renglonesSinCosto++;
    }
  }

  return {
    totalVentas,
    cantidadVentas: completadas.length,
    margenBruto,
    renglonesConCosto,
    renglonesSinCosto,
  };
}

export interface ProductoVendido {
  producto_id: string;
  nombre: string;
  cantidad: number;
  monto: number;
}

// Dashboard (/admin): top de productos por monto vendido en un rango -- agregación en JS sobre
// renglones_venta de ventas completadas, mismo criterio que el resto del repo.
export async function topProductosVendidos(
  supabase: SupabaseClient<Database>,
  { desde, hasta, limit }: { desde: string; hasta: string; limit: number },
): Promise<ProductoVendido[]> {
  const ventas = await listVentas(supabase, { desde, hasta });
  const completadas = ventas.filter((v) => v.estado === "completada");
  if (completadas.length === 0) return [];

  const { data: renglones, error } = await supabase
    .from("renglones_venta")
    .select("producto_id, cantidad, subtotal")
    .in(
      "venta_id",
      completadas.map((v) => v.id),
    );
  if (error) throw error;

  const agrupado = new Map<string, { cantidad: number; monto: number }>();
  for (const r of renglones) {
    const actual = agrupado.get(r.producto_id) ?? { cantidad: 0, monto: 0 };
    actual.cantidad += Number(r.cantidad);
    actual.monto += Number(r.subtotal);
    agrupado.set(r.producto_id, actual);
  }

  const { data: productos, error: productosError } = await supabase
    .from("productos")
    .select("id, nombre")
    .in("id", Array.from(agrupado.keys()));
  if (productosError) throw productosError;
  const nombrePorId = new Map(productos.map((p) => [p.id, p.nombre]));

  return Array.from(agrupado.entries())
    .map(([producto_id, v]) => ({
      producto_id,
      nombre: nombrePorId.get(producto_id) ?? "—",
      cantidad: v.cantidad,
      monto: v.monto,
    }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, limit);
}

export interface VentasPorDiaCategoria {
  dias: string[];
  categorias: { id: string; nombre: string }[];
  matriz: number[][];
}

function enumerarDias(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  const cursor = new Date(`${desde}T00:00:00Z`);
  const fin = new Date(`${hasta}T00:00:00Z`);
  while (cursor <= fin) {
    dias.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dias;
}

// Dashboard (/admin): monto vendido por día x categoría en un rango, para el gráfico de barras
// agrupadas. Mismo criterio de agregación en JS que resumenVentasPorRango/topProductosVendidos
// (listVentas + renglones_venta, sin vista/RPC nueva). Categorías en orden fijo (alfabético) para
// que el color de cada una no cambie según los datos del rango.
export async function ventasPorDiaYCategoria(
  supabase: SupabaseClient<Database>,
  { desde, hasta }: { desde: string; hasta: string },
): Promise<VentasPorDiaCategoria> {
  const dias = enumerarDias(desde, hasta);

  const { data: categorias, error: categoriasError } = await supabase
    .from("categorias")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");
  if (categoriasError) throw categoriasError;

  const matrizVacia = () => categorias.map(() => dias.map(() => 0));

  const ventas = await listVentas(supabase, { desde, hasta });
  const completadas = ventas.filter((v) => v.estado === "completada");
  if (completadas.length === 0) {
    return { dias, categorias, matriz: matrizVacia() };
  }

  const diaPorVenta = new Map(completadas.map((v) => [v.id, v.fecha.slice(0, 10)]));

  const { data: renglones, error: renglonesError } = await supabase
    .from("renglones_venta")
    .select("venta_id, producto_id, subtotal")
    .in(
      "venta_id",
      completadas.map((v) => v.id),
    );
  if (renglonesError) throw renglonesError;

  const productoIds = Array.from(new Set(renglones.map((r) => r.producto_id)));
  const { data: productos, error: productosError } = await supabase
    .from("productos")
    .select("id, categoria_id")
    .in("id", productoIds);
  if (productosError) throw productosError;
  const categoriaPorProducto = new Map(productos.map((p) => [p.id, p.categoria_id]));

  const indexDia = new Map(dias.map((d, i) => [d, i]));
  const indexCategoria = new Map(categorias.map((c, i) => [c.id, i]));
  const matriz = matrizVacia();

  for (const r of renglones) {
    const dia = diaPorVenta.get(r.venta_id);
    const categoriaId = categoriaPorProducto.get(r.producto_id);
    if (dia === undefined || categoriaId === undefined) continue;
    const di = indexDia.get(dia);
    const ci = indexCategoria.get(categoriaId);
    if (di === undefined || ci === undefined) continue;
    matriz[ci][di] += Number(r.subtotal);
  }

  return { dias, categorias, matriz };
}

export interface ListVentasPaginadoParams {
  page: number;
  pageSize: number;
  cajaTurnoId?: string;
  desde?: string;
  hasta?: string;
  sort?: { column: string; ascending: boolean };
}

// Listado paginado/ordenado server-side para el DataTable de /admin/ventas (mismos filtros que
// listVentas, aplicados como builder calls en vez de leer searchParams).
export async function listVentasPaginated(
  supabase: SupabaseClient<Database>,
  { page, pageSize, cajaTurnoId, desde, hasta, sort }: ListVentasPaginadoParams,
): Promise<{ data: Venta[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let request = supabase.from("ventas").select("*", { count: "exact" });
  if (cajaTurnoId) request = request.eq("caja_turno_id", cajaTurnoId);
  if (desde) request = request.gte("fecha", desde);
  if (hasta) request = request.lte("fecha", `${hasta}T23:59:59`);

  request = sort
    ? request.order(sort.column, { ascending: sort.ascending })
    : request.order("fecha", { ascending: false });

  const { data, error, count } = await request.range(from, to);
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}
