import { createClient } from "@/lib/supabase/server";
import { getConfiguracionNegocio } from "@/repositories/configuracionRepository";
import { ConfiguracionForm } from "@/features/configuracion/components/ConfiguracionForm";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const configuracion = await getConfiguracionNegocio(supabase);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Configuración del negocio</h1>
      <ConfiguracionForm configuracion={configuracion} />
    </div>
  );
}
