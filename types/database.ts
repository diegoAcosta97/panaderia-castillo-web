// Tipos del esquema de Supabase, tipados a mano para que coincidan exactamente con las
// migraciones aplicadas en supabase/migrations/. Se puede reemplazar en cualquier momento por
// la salida real de `supabase gen types typescript` sin romper nada, siempre que coincida con
// el esquema aplicado.
//
// Se amplía a medida que se aplican nuevas migraciones.

export type RolUsuario = "administrador" | "cajero";
export type TipoVentaProducto = "unidad" | "peso";
export type TipoMovimientoStock =
  | "venta"
  | "anulacion_venta"
  | "etiqueta_generada"
  | "ajuste_control_stock"
  | "ajuste_manual"
  | "alta_inicial";
export type EstadoCajaTurno = "abierta" | "cerrada";
export type TipoBeneficioOferta = "precio_fijo" | "descuento_porcentaje" | "descuento_monto";
export type TipoEfectoDescuento = "porcentaje" | "monto_fijo";
export type TipoCondicionDescuento = "monto_minimo" | "producto_incluido" | "categoria_incluida";
export type EstadoVenta = "pendiente_pago" | "completada" | "anulada";
export type MedioPago = "efectivo" | "mercado_pago";
export type EstadoPagoMedio = "pendiente" | "acreditado" | "rechazado";
export type EstadoControlStock =
  | "en_progreso"
  | "pendiente_aprobacion"
  | "aprobado"
  | "rechazado";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      perfiles: {
        Row: {
          id: string;
          email: string;
          rol: RolUsuario;
          nombre_completo: string | null;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          rol?: RolUsuario;
          nombre_completo?: string | null;
          activo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          rol?: RolUsuario;
          nombre_completo?: string | null;
          activo?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      configuracion_negocio: {
        Row: {
          id: string;
          nombre_comercial: string;
          direccion: string | null;
          telefono: string | null;
          cuit: string | null;
          updated_at: string;
          mercadopago_store_id: string | null;
          mercadopago_external_pos_id: string | null;
        };
        Insert: {
          id?: string;
          nombre_comercial: string;
          direccion?: string | null;
          telefono?: string | null;
          cuit?: string | null;
          updated_at?: string;
          mercadopago_store_id?: string | null;
          mercadopago_external_pos_id?: string | null;
        };
        Update: {
          id?: string;
          nombre_comercial?: string;
          direccion?: string | null;
          telefono?: string | null;
          cuit?: string | null;
          updated_at?: string;
          mercadopago_store_id?: string | null;
          mercadopago_external_pos_id?: string | null;
        };
        Relationships: [];
      };
      categorias: {
        Row: {
          id: string;
          nombre: string;
          activo: boolean;
        };
        Insert: {
          id?: string;
          nombre: string;
          activo?: boolean;
        };
        Update: {
          id?: string;
          nombre?: string;
          activo?: boolean;
        };
        Relationships: [];
      };
      productos: {
        Row: {
          id: string;
          categoria_id: string;
          nombre: string;
          codigo_barras: string;
          tipo_venta: TipoVentaProducto;
          precio: number;
          controla_stock: boolean;
          stock_actual: number | null;
          stock_minimo: number | null;
          dias_vencimiento_default: number | null;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          categoria_id: string;
          nombre: string;
          codigo_barras: string;
          tipo_venta: TipoVentaProducto;
          precio: number;
          controla_stock?: boolean;
          stock_actual?: number | null;
          stock_minimo?: number | null;
          dias_vencimiento_default?: number | null;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          categoria_id?: string;
          nombre?: string;
          codigo_barras?: string;
          tipo_venta?: TipoVentaProducto;
          precio?: number;
          controla_stock?: boolean;
          stock_actual?: number | null;
          stock_minimo?: number | null;
          dias_vencimiento_default?: number | null;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      movimientos_stock: {
        Row: {
          id: string;
          producto_id: string;
          tipo: TipoMovimientoStock;
          cantidad: number;
          stock_resultante: number;
          referencia_id: string | null;
          usuario_id: string;
          fecha: string;
        };
        Insert: {
          id?: string;
          producto_id: string;
          tipo: TipoMovimientoStock;
          cantidad: number;
          stock_resultante: number;
          referencia_id?: string | null;
          usuario_id: string;
          fecha?: string;
        };
        Update: {
          id?: string;
          producto_id?: string;
          tipo?: TipoMovimientoStock;
          cantidad?: number;
          stock_resultante?: number;
          referencia_id?: string | null;
          usuario_id?: string;
          fecha?: string;
        };
        Relationships: [];
      };
      etiqueta_lotes: {
        Row: {
          id: string;
          producto_id: string;
          cantidad: number;
          fecha_vencimiento: string | null;
          precio_impreso: number;
          usuario_id: string;
          fecha_generacion: string;
        };
        Insert: {
          id?: string;
          producto_id: string;
          cantidad: number;
          fecha_vencimiento?: string | null;
          precio_impreso: number;
          usuario_id: string;
          fecha_generacion?: string;
        };
        Update: {
          id?: string;
          producto_id?: string;
          cantidad?: number;
          fecha_vencimiento?: string | null;
          precio_impreso?: number;
          usuario_id?: string;
          fecha_generacion?: string;
        };
        Relationships: [];
      };
      controles_stock: {
        Row: {
          id: string;
          usuario_id: string;
          estado: EstadoControlStock;
          usuario_aprobador_id: string | null;
          fecha_inicio: string;
          fecha_cierre: string | null;
          fecha_aprobacion: string | null;
          observaciones: string | null;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          estado?: EstadoControlStock;
          usuario_aprobador_id?: string | null;
          fecha_inicio?: string;
          fecha_cierre?: string | null;
          fecha_aprobacion?: string | null;
          observaciones?: string | null;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          estado?: EstadoControlStock;
          usuario_aprobador_id?: string | null;
          fecha_inicio?: string;
          fecha_cierre?: string | null;
          fecha_aprobacion?: string | null;
          observaciones?: string | null;
        };
        Relationships: [];
      };
      control_stock_detalles: {
        Row: {
          id: string;
          control_stock_id: string;
          producto_id: string;
          stock_sistema: number;
          stock_contado: number;
          diferencia: number;
        };
        Insert: {
          id?: string;
          control_stock_id: string;
          producto_id: string;
          stock_sistema: number;
          stock_contado: number;
        };
        Update: {
          id?: string;
          control_stock_id?: string;
          producto_id?: string;
          stock_sistema?: number;
          stock_contado?: number;
        };
        Relationships: [];
      };
      caja_turnos: {
        Row: {
          id: string;
          fecha: string;
          etiqueta_turno: string | null;
          usuario_apertura_id: string;
          monto_apertura: number;
          fecha_apertura: string;
          usuario_cierre_id: string | null;
          monto_cierre_declarado: number | null;
          efectivo_esperado: number | null;
          diferencia: number | null;
          fecha_cierre: string | null;
          estado: EstadoCajaTurno;
          observaciones: string | null;
        };
        Insert: {
          id?: string;
          fecha?: string;
          etiqueta_turno?: string | null;
          usuario_apertura_id: string;
          monto_apertura: number;
          fecha_apertura?: string;
          usuario_cierre_id?: string | null;
          monto_cierre_declarado?: number | null;
          efectivo_esperado?: number | null;
          diferencia?: number | null;
          fecha_cierre?: string | null;
          estado?: EstadoCajaTurno;
          observaciones?: string | null;
        };
        Update: {
          id?: string;
          fecha?: string;
          etiqueta_turno?: string | null;
          usuario_apertura_id?: string;
          monto_apertura?: number;
          fecha_apertura?: string;
          usuario_cierre_id?: string | null;
          monto_cierre_declarado?: number | null;
          efectivo_esperado?: number | null;
          diferencia?: number | null;
          fecha_cierre?: string | null;
          estado?: EstadoCajaTurno;
          observaciones?: string | null;
        };
        Relationships: [];
      };
      proveedores: {
        Row: {
          id: string;
          nombre: string;
          cuit: string | null;
          telefono: string | null;
          email: string | null;
          direccion: string | null;
          activo: boolean;
        };
        Insert: {
          id?: string;
          nombre: string;
          cuit?: string | null;
          telefono?: string | null;
          email?: string | null;
          direccion?: string | null;
          activo?: boolean;
        };
        Update: {
          id?: string;
          nombre?: string;
          cuit?: string | null;
          telefono?: string | null;
          email?: string | null;
          direccion?: string | null;
          activo?: boolean;
        };
        Relationships: [];
      };
      gastos: {
        Row: {
          id: string;
          caja_turno_id: string;
          proveedor_id: string;
          concepto: string;
          monto: number;
          comprobante_url: string | null;
          usuario_id: string;
          fecha: string;
        };
        Insert: {
          id?: string;
          caja_turno_id: string;
          proveedor_id: string;
          concepto: string;
          monto: number;
          comprobante_url?: string | null;
          usuario_id: string;
          fecha?: string;
        };
        Update: {
          id?: string;
          caja_turno_id?: string;
          proveedor_id?: string;
          concepto?: string;
          monto?: number;
          comprobante_url?: string | null;
          usuario_id?: string;
          fecha?: string;
        };
        Relationships: [];
      };
      ofertas: {
        Row: {
          id: string;
          nombre: string;
          descripcion: string | null;
          tipo_beneficio: TipoBeneficioOferta;
          valor_beneficio: number;
          max_aplicaciones_por_venta: number | null;
          fecha_inicio: string | null;
          fecha_fin: string | null;
          activo: boolean;
        };
        Insert: {
          id?: string;
          nombre: string;
          descripcion?: string | null;
          tipo_beneficio: TipoBeneficioOferta;
          valor_beneficio: number;
          max_aplicaciones_por_venta?: number | null;
          fecha_inicio?: string | null;
          fecha_fin?: string | null;
          activo?: boolean;
        };
        Update: {
          id?: string;
          nombre?: string;
          descripcion?: string | null;
          tipo_beneficio?: TipoBeneficioOferta;
          valor_beneficio?: number;
          max_aplicaciones_por_venta?: number | null;
          fecha_inicio?: string | null;
          fecha_fin?: string | null;
          activo?: boolean;
        };
        Relationships: [];
      };
      oferta_items: {
        Row: {
          id: string;
          oferta_id: string;
          producto_id: string;
          cantidad_requerida: number;
        };
        Insert: {
          id?: string;
          oferta_id: string;
          producto_id: string;
          cantidad_requerida: number;
        };
        Update: {
          id?: string;
          oferta_id?: string;
          producto_id?: string;
          cantidad_requerida?: number;
        };
        Relationships: [];
      };
      descuentos: {
        Row: {
          id: string;
          nombre: string;
          descripcion: string | null;
          tipo_efecto: TipoEfectoDescuento;
          valor_efecto: number;
          fecha_inicio: string | null;
          fecha_fin: string | null;
          activo: boolean;
        };
        Insert: {
          id?: string;
          nombre: string;
          descripcion?: string | null;
          tipo_efecto: TipoEfectoDescuento;
          valor_efecto: number;
          fecha_inicio?: string | null;
          fecha_fin?: string | null;
          activo?: boolean;
        };
        Update: {
          id?: string;
          nombre?: string;
          descripcion?: string | null;
          tipo_efecto?: TipoEfectoDescuento;
          valor_efecto?: number;
          fecha_inicio?: string | null;
          fecha_fin?: string | null;
          activo?: boolean;
        };
        Relationships: [];
      };
      descuento_condiciones: {
        Row: {
          id: string;
          descuento_id: string;
          tipo_condicion: TipoCondicionDescuento;
          monto_minimo: number | null;
          producto_id: string | null;
          categoria_id: string | null;
          cantidad_minima: number | null;
        };
        Insert: {
          id?: string;
          descuento_id: string;
          tipo_condicion: TipoCondicionDescuento;
          monto_minimo?: number | null;
          producto_id?: string | null;
          categoria_id?: string | null;
          cantidad_minima?: number | null;
        };
        Update: {
          id?: string;
          descuento_id?: string;
          tipo_condicion?: TipoCondicionDescuento;
          monto_minimo?: number | null;
          producto_id?: string | null;
          categoria_id?: string | null;
          cantidad_minima?: number | null;
        };
        Relationships: [];
      };
      ventas: {
        Row: {
          id: string;
          numero_comprobante: number;
          caja_turno_id: string;
          usuario_id: string;
          subtotal: number;
          total_ofertas: number;
          total_descuentos: number;
          total: number;
          estado: EstadoVenta;
          fecha: string;
          anulada_por_id: string | null;
          fecha_anulacion: string | null;
          motivo_anulacion: string | null;
        };
        Insert: {
          id?: string;
          numero_comprobante?: number;
          caja_turno_id: string;
          usuario_id: string;
          subtotal: number;
          total_ofertas?: number;
          total_descuentos?: number;
          total: number;
          estado?: EstadoVenta;
          fecha?: string;
          anulada_por_id?: string | null;
          fecha_anulacion?: string | null;
          motivo_anulacion?: string | null;
        };
        Update: {
          id?: string;
          numero_comprobante?: number;
          caja_turno_id?: string;
          usuario_id?: string;
          subtotal?: number;
          total_ofertas?: number;
          total_descuentos?: number;
          total?: number;
          estado?: EstadoVenta;
          fecha?: string;
          anulada_por_id?: string | null;
          fecha_anulacion?: string | null;
          motivo_anulacion?: string | null;
        };
        Relationships: [];
      };
      renglones_venta: {
        Row: {
          id: string;
          venta_id: string;
          producto_id: string;
          cantidad: number;
          precio_unitario_snapshot: number;
          subtotal: number;
        };
        Insert: {
          id?: string;
          venta_id: string;
          producto_id: string;
          cantidad: number;
          precio_unitario_snapshot: number;
          subtotal: number;
        };
        Update: {
          id?: string;
          venta_id?: string;
          producto_id?: string;
          cantidad?: number;
          precio_unitario_snapshot?: number;
          subtotal?: number;
        };
        Relationships: [];
      };
      venta_ofertas_aplicadas: {
        Row: {
          id: string;
          venta_id: string;
          oferta_id: string;
          veces_aplicada: number;
          monto_beneficio: number;
        };
        Insert: {
          id?: string;
          venta_id: string;
          oferta_id: string;
          veces_aplicada: number;
          monto_beneficio: number;
        };
        Update: {
          id?: string;
          venta_id?: string;
          oferta_id?: string;
          veces_aplicada?: number;
          monto_beneficio?: number;
        };
        Relationships: [];
      };
      venta_descuentos_aplicados: {
        Row: {
          id: string;
          venta_id: string;
          descuento_id: string;
          monto_aplicado: number;
        };
        Insert: {
          id?: string;
          venta_id: string;
          descuento_id: string;
          monto_aplicado: number;
        };
        Update: {
          id?: string;
          venta_id?: string;
          descuento_id?: string;
          monto_aplicado?: number;
        };
        Relationships: [];
      };
      venta_medios_pago: {
        Row: {
          id: string;
          venta_id: string;
          medio_pago: MedioPago;
          monto: number;
          estado_pago: EstadoPagoMedio;
          mp_payment_id: string | null;
          mp_referencia_externa: string | null;
          mp_orden_id: string | null;
          fecha_acreditacion: string | null;
        };
        Insert: {
          id?: string;
          venta_id: string;
          medio_pago: MedioPago;
          monto: number;
          estado_pago?: EstadoPagoMedio;
          mp_payment_id?: string | null;
          mp_referencia_externa?: string | null;
          mp_orden_id?: string | null;
          fecha_acreditacion?: string | null;
        };
        Update: {
          id?: string;
          venta_id?: string;
          medio_pago?: MedioPago;
          monto?: number;
          estado_pago?: EstadoPagoMedio;
          mp_payment_id?: string | null;
          mp_referencia_externa?: string | null;
          mp_orden_id?: string | null;
          fecha_acreditacion?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      confirmar_venta: {
        Args: {
          p_caja_turno_id: string;
          p_renglones: Json;
          p_ofertas: Json;
          p_descuentos: Json;
          p_medios_pago: Json;
        };
        Returns: Json;
      };
      anular_venta: {
        Args: {
          p_venta_id: string;
          p_motivo: string;
        };
        Returns: undefined;
      };
      registrar_qr_pago: {
        Args: {
          p_venta_medio_pago_id: string;
          p_mp_referencia_externa: string;
          p_mp_payment_id: string;
          p_mp_orden_id: string;
        };
        Returns: undefined;
      };
      hay_pago_mp_pendiente: {
        Args: {
          p_excluir_venta_id: string;
        };
        Returns: boolean;
      };
      cancelar_venta_pendiente: {
        Args: {
          p_venta_id: string;
        };
        Returns: Json;
      };
      procesar_resultado_pago_mp: {
        Args: {
          p_mp_referencia_externa: string;
          p_mp_payment_id: string;
          p_acreditado: boolean;
        };
        Returns: Json;
      };
      generar_lote_etiquetas: {
        Args: {
          p_producto_id: string;
          p_cantidad: number;
          p_fecha_vencimiento: string | null;
        };
        Returns: Json;
      };
      aprobar_control_stock: {
        Args: {
          p_control_stock_id: string;
          p_aprobador_id: string;
        };
        Returns: undefined;
      };
      actualizar_rol_perfil: {
        Args: {
          p_id: string;
          p_rol: RolUsuario | null;
          p_activo: boolean | null;
        };
        Returns: undefined;
      };
      cerrar_turno: {
        Args: {
          p_turno_id: string;
          p_monto_cierre_declarado: number;
          p_observaciones: string | null;
        };
        Returns: Database["public"]["Tables"]["caja_turnos"]["Row"];
      };
    };
    Enums: {
      rol_usuario: RolUsuario;
      tipo_venta_producto: TipoVentaProducto;
      tipo_movimiento_stock: TipoMovimientoStock;
      tipo_beneficio_oferta: TipoBeneficioOferta;
      tipo_efecto_descuento: TipoEfectoDescuento;
      tipo_condicion_descuento: TipoCondicionDescuento;
      estado_caja_turno: EstadoCajaTurno;
      estado_venta: EstadoVenta;
      medio_pago: MedioPago;
      estado_pago_medio: EstadoPagoMedio;
      estado_control_stock: EstadoControlStock;
    };
    CompositeTypes: Record<never, never>;
  };
}
