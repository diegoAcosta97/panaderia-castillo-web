"use server";

import { getServerSession } from "@/features/auth/services/sessionService";
import { createClient } from "@/lib/supabase/server";
import { ejecutarAccion, type ActionResult } from "@/lib/actionResult";

// Cambio de contraseña propia (cualquier rol logueado, vía menú). Se pide la contraseña actual
// y se reautentica con signInWithPassword antes de actualizar -- así una sesión abierta en un
// dispositivo compartido no alcanza sola para tomar la cuenta.
export async function cambiarPasswordPropia(
  passwordActual: string,
  passwordNueva: string,
): Promise<ActionResult<void>> {
  return ejecutarAccion(async () => {
    const session = await getServerSession();
    if (!session?.user.email) throw new Error("No autorizado.");

    const supabase = await createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: passwordActual,
    });
    if (signInError) throw new Error("La contraseña actual no es correcta.");

    const { error } = await supabase.auth.updateUser({ password: passwordNueva });
    if (error) throw error;
  }, "No se pudo cambiar la contraseña");
}
