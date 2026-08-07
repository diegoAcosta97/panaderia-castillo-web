"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/features/auth/services/sessionService";
import { createClient } from "@/lib/supabase/server";
import { getTurnoAbierto } from "@/repositories/cajaTurnosRepository";
import { crearGasto as crearGastoRepo, type Gasto } from "@/repositories/gastosRepository";

// Nunca recibe caja_turno_id del cliente: siempre resuelve el turno abierto server-side
// (docs/backlog/05-proveedores-gastos.md#E5-2) — evita que un gasto termine cargado contra un
// turno que ya no está abierto por una referencia vieja en el cliente.
export async function crearGasto(input: {
  proveedorId: string;
  concepto: string;
  monto: number;
}): Promise<Gasto> {
  const session = await getServerSession();
  if (!session) throw new Error("No autorizado.");

  const supabase = await createClient();
  const turno = await getTurnoAbierto(supabase);
  if (!turno) throw new Error("No hay un turno de caja abierto.");

  const gasto = await crearGastoRepo(supabase, {
    caja_turno_id: turno.id,
    proveedor_id: input.proveedorId,
    concepto: input.concepto,
    monto: input.monto,
  });

  revalidatePath("/pos/gastos");
  return gasto;
}
