import { createClient } from "@/lib/supabase/server";
import { listProveedores } from "@/repositories/proveedoresRepository";
import { GastosTable } from "@/features/gastos/components/GastosTable";

export default async function GastosHistorialPage() {
  const supabase = await createClient();
  const proveedores = await listProveedores(supabase);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold print:hidden">Gastos</h1>
      <GastosTable proveedores={proveedores} />
    </div>
  );
}
