import { createClient } from "@/lib/supabase/server";
import { getOwnProfile } from "@/repositories/perfilesRepository";
import type { Session } from "@/features/auth/types";

/**
 * Resuelve la sesión (usuario + perfil + rol) del lado del servidor: Server Components, Route
 * Handlers y proxy. Usa el cliente de Supabase que lee la cookie de sesión
 * (lib/supabase/server.ts).
 */
export async function getServerSession(): Promise<Session | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const perfil = await getOwnProfile(supabase);
  if (!perfil) return null;

  return {
    user: { id: user.id, email: user.email ?? null },
    perfil,
    rol: perfil.rol,
  };
}
