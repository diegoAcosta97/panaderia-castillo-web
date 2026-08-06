import type { RolUsuario } from "@/types/database";
import type { Perfil } from "@/repositories/perfilesRepository";

export type Rol = RolUsuario;

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface Session {
  user: AuthUser;
  perfil: Perfil;
  rol: Rol;
}
