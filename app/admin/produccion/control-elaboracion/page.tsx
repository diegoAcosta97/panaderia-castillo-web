import { createClient } from "@/lib/supabase/server";
import { getConfiguracionNegocio } from "@/repositories/configuracionRepository";
import { ControlElaboracionScreen } from "@/features/produccion/components/ControlElaboracionScreen";

// E16-7: planilla mensual imprimible "Registro de control de elaboración" (docs/backlog/16-produccion.md).
export default async function ControlElaboracionPage() {
  const supabase = await createClient();
  const configuracion = await getConfiguracionNegocio(supabase);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold print:hidden">Control de elaboración</h1>
      <ControlElaboracionScreen nombreComercial={configuracion.nombre_comercial} />
    </div>
  );
}
