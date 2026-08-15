import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTurnoAbierto } from "@/repositories/cajaTurnosRepository";
import { CierreTurnoForm } from "@/features/caja/components/CierreTurnoForm";

export default async function CierreTurnoPage() {
  const supabase = await createClient();
  const turno = await getTurnoAbierto(supabase);
  if (!turno) redirect("/pos/caja");

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Cerrar turno</h1>
      <CierreTurnoForm turno={turno} />
    </div>
  );
}
