"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/features/auth/services/sessionService";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { updatePerfil } from "@/repositories/perfilesRepository";
import type { RolUsuario } from "@/types/database";

async function requireAdmin() {
  const session = await getServerSession();
  if (!session || session.rol !== "administrador") {
    throw new Error("No autorizado.");
  }
}

export async function crearUsuario(input: {
  email: string;
  password: string;
  nombreCompleto: string;
  rol: RolUsuario;
}) {
  await requireAdmin();

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (error) throw error;

  const userId = data.user!.id;

  // El trigger on_auth_user_created ya insertó el perfil (rol 'cajero' por default, sin
  // nombre) — acá se completa.
  const { error: updateError } = await admin
    .from("perfiles")
    .update({ nombre_completo: input.nombreCompleto, rol: input.rol })
    .eq("id", userId);
  if (updateError) throw updateError;

  revalidatePath("/admin/usuarios");
}

export async function actualizarUsuario(
  id: string,
  patch: { rol?: RolUsuario; activo?: boolean; nombreCompleto?: string },
) {
  await requireAdmin();

  const supabase = await createClient();
  await updatePerfil(supabase, id, {
    rol: patch.rol,
    activo: patch.activo,
    nombre_completo: patch.nombreCompleto,
  });

  revalidatePath("/admin/usuarios");
}
