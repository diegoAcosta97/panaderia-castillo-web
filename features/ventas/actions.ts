"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/features/auth/services/sessionService";
import { createClient } from "@/lib/supabase/server";
import { anularVenta as anularVentaRepo } from "@/repositories/ventasRepository";
import { ejecutarAccion, type ActionResult } from "@/lib/actionResult";

export async function anularVenta(ventaId: string, motivo: string): Promise<ActionResult<void>> {
  return ejecutarAccion(async () => {
    const session = await getServerSession();
    if (!session || session.rol !== "administrador") {
      throw new Error("No autorizado.");
    }

    const supabase = await createClient();
    await anularVentaRepo(supabase, ventaId, motivo);

    revalidatePath("/admin/ventas");
    revalidatePath(`/admin/ventas/${ventaId}`);
  }, "No se pudo anular la venta");
}
