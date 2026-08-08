import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTurnoAbierto } from "@/repositories/cajaTurnosRepository";
import { PosTopBar } from "@/features/layout/components/PosTopBar";

// E4-2: bloquea el resto de /pos (venta, gastos, etiquetas) mientras no haya un turno de caja
// abierto. /pos/caja queda deliberadamente afuera de este route group — es la pantalla para
// abrir uno, no puede depender de que ya exista.
export default async function PosOperacionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const turno = await getTurnoAbierto(supabase);

  if (!turno) redirect("/pos/caja");

  return (
    <div className="flex min-h-svh flex-col">
      <PosTopBar />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
