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
        };
        Insert: {
          id?: string;
          nombre_comercial: string;
          direccion?: string | null;
          telefono?: string | null;
          cuit?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nombre_comercial?: string;
          direccion?: string | null;
          telefono?: string | null;
          cuit?: string | null;
          updated_at?: string;
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
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      rol_usuario: RolUsuario;
      tipo_venta_producto: TipoVentaProducto;
      tipo_movimiento_stock: TipoMovimientoStock;
      tipo_beneficio_oferta: TipoBeneficioOferta;
      tipo_efecto_descuento: TipoEfectoDescuento;
      tipo_condicion_descuento: TipoCondicionDescuento;
      estado_caja_turno: EstadoCajaTurno;
    };
    CompositeTypes: Record<never, never>;
  };
}
