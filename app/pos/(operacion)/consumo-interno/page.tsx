import { createClient } from "@/lib/supabase/server";
import { listEmpleados } from "@/repositories/empleadosRepository";
import { PantallaConsumoInterno } from "@/features/consumo-interno/components/PantallaConsumoInterno";

// El layout de app/pos/(operacion) ya garantiza que haya un turno abierto para llegar acá
// (E4-2), mismo criterio que /pos/gastos y /pos/etiquetas.
export default async function ConsumoInternoPage() {
  const supabase = await createClient();
  const empleados = await listEmpleados(supabase);
  const empleadosActivos = empleados.filter((e) => e.activo);

  return <PantallaConsumoInterno empleados={empleadosActivos} />;
}
