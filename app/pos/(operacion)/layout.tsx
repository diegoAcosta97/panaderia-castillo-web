import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTurnoAbierto } from "@/repositories/cajaTurnosRepository";

// E4-2: bloquea el resto de /pos (venta, gastos, etiquetas en epics futuras) mientras no haya
// un turno de caja abierto. /pos/caja queda deliberadamente afuera de este route group — es la
// pantalla para abrir uno, no puede depender de que ya exista.
export default async function PosOperacionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const turno = await getTurnoAbierto(supabase);

  if (!turno) redirect("/pos/caja");

  return <>{children}</>;
}
