import type { TipoMovimientoStock } from "@/types/database";

// E14-6: etiquetas en español para el filtro y la columna "Tipo" del historial admin.
export const TIPO_MOVIMIENTO_LABELS: Record<TipoMovimientoStock, string> = {
  venta: "Venta",
  anulacion_venta: "Anulación de venta",
  etiqueta_generada: "Etiqueta generada",
  ajuste_control_stock: "Ajuste (control de stock)",
  ajuste_manual: "Ajuste manual",
  alta_inicial: "Alta inicial",
  merma: "Merma",
  consumo_interno: "Consumo interno",
  ingreso_mercaderia: "Ingreso de mercadería",
};

export const TIPOS_MOVIMIENTO_ORDENADOS = Object.keys(
  TIPO_MOVIMIENTO_LABELS,
) as TipoMovimientoStock[];
