// Tipos del esquema de Supabase, tipados a mano para que coincidan exactamente con las
// migraciones aplicadas en supabase/migrations/. Se puede reemplazar en cualquier momento por
// la salida real de `supabase gen types typescript` sin romper nada, siempre que coincida con
// el esquema aplicado.
//
// Se amplía a medida que se aplican nuevas migraciones.

export type RolUsuario = "administrador" | "cajero";

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
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      rol_usuario: RolUsuario;
    };
    CompositeTypes: Record<never, never>;
  };
}
