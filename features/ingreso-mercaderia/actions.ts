"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/features/auth/services/sessionService";
import { createClient } from "@/lib/supabase/server";
import {
  aprobarIngresoMercaderia as aprobarIngresoMercaderiaRepo,
  rechazarIngresoMercaderia as rechazarIngresoMercaderiaRepo,
} from "@/repositories/ingresoMercaderiaRepository";
import { ejecutarAccion, type ActionResult } from "@/lib/actionResult";

async function requireAdmin() {
  const session = await getServerSession();
  if (!session || session.rol !== "administrador") {
    throw new Error("No autorizado.");
  }
  return session;
}

export async function aprobarIngresoMercaderia(
  ingresoMercaderiaId: string,
): Promise<ActionResult<void>> {
  return ejecutarAccion(async () => {
    const session = await requireAdmin();
    const supabase = await createClient();
    await aprobarIngresoMercaderiaRepo(supabase, ingresoMercaderiaId, session.user.id);

    revalidatePath("/admin/ingresos-mercaderia");
    revalidatePath(`/admin/ingresos-mercaderia/${ingresoMercaderiaId}`);
    revalidatePath("/admin/productos");
  }, "No se pudo aprobar el ingreso de mercadería");
}

export async function rechazarIngresoMercaderia(
  ingresoMercaderiaId: string,
): Promise<ActionResult<void>> {
  return ejecutarAccion(async () => {
    const session = await requireAdmin();
    const supabase = await createClient();
    await rechazarIngresoMercaderiaRepo(supabase, ingresoMercaderiaId, session.user.id);

    revalidatePath("/admin/ingresos-mercaderia");
    revalidatePath(`/admin/ingresos-mercaderia/${ingresoMercaderiaId}`);
  }, "No se pudo rechazar el ingreso de mercadería");
}
