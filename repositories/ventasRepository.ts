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
): Promise<void> {
  const { error } = await supabase.rpc("registrar_qr_pago", {
    p_venta_medio_pago_id: ventaMedioPagoId,
    p_mp_referencia_externa: mpReferenciaExterna,
    p_mp_payment_id: mpPaymentId,
  });
  if (error) throw error;
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
