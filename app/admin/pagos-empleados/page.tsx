import { createClient } from "@/lib/supabase/server";
import { listEmpleados } from "@/repositories/empleadosRepository";
import { NuevoPagoEmpleadoForm } from "@/features/pagos-empleados/components/NuevoPagoEmpleadoForm";
import { PagosEmpleadosTable } from "@/features/pagos-empleados/components/PagosEmpleadosTable";

export default async function PagosEmpleadosPage() {
  const supabase = await createClient();
  const empleados = await listEmpleados(supabase);
  const empleadosActivos = empleados.filter((e) => e.activo);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Al exportar el listado (PagosEmpleadosTable dispara window.print()) solo tiene que
          imprimirse la tabla de abajo, no el título ni el formulario de alta. */}
      <div className="flex flex-col gap-6 print:hidden">
        <h1 className="text-2xl font-semibold">Pagos a empleados</h1>
        <NuevoPagoEmpleadoForm empleados={empleadosActivos} />
      </div>
      <PagosEmpleadosTable empleados={empleados} />
    </div>
  );
}
