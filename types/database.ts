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
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      rol_usuario: RolUsuario;
      tipo_venta_producto: TipoVentaProducto;
      tipo_movimiento_stock: TipoMovimientoStock;
    };
    CompositeTypes: Record<never, never>;
  };
}
