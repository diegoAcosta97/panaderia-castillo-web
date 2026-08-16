import { createClient } from "@/lib/supabase/server";
import { listEmpleados } from "@/repositories/empleadosRepository";
import { PantallaConsumoInterno } from "@/features/consumo-interno/components/PantallaConsumoInterno";

// registrar_consumo_interno no depende de un turno de caja abierto -- a diferencia de
// /pos/(operacion)/consumo-interno, esta página no necesita ese gate.
export default async function ConsumoInternoPage() {
  const supabase = await createClient();
  const empleados = await listEmpleados(supabase);
  const empleadosActivos = empleados.filter((e) => e.activo);

  return <PantallaConsumoInterno empleados={empleadosActivos} />;
}
