import { createClient } from "@/lib/supabase/server";
import { listProductosParaProduccion } from "@/repositories/productosRepository";
import { listEmpleados } from "@/repositories/empleadosRepository";
import { NuevaProduccionForm } from "@/features/produccion/components/NuevaProduccionForm";
import { ProduccionesTable } from "@/features/produccion/components/ProduccionesTable";

// E16: alta + historial de producciones propias, enteramente admin (docs/backlog/16-produccion.md).
export default async function ProduccionPage() {
  const supabase = await createClient();
  const [productos, empleados] = await Promise.all([
    listProductosParaProduccion(supabase),
    listEmpleados(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Producción</h1>
      <NuevaProduccionForm productos={productos} empleados={empleados} />
      <ProduccionesTable empleados={empleados} />
    </div>
  );
}
