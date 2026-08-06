import { createClient } from "@/lib/supabase/server";
import { listProveedores } from "@/repositories/proveedoresRepository";
import { ProveedorDialog } from "@/features/proveedores/components/ProveedorDialog";
import { ProveedoresTable } from "@/features/proveedores/components/ProveedoresTable";

export default async function ProveedoresPage() {
  const supabase = await createClient();
  const proveedores = await listProveedores(supabase);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Proveedores</h1>
        <ProveedorDialog />
      </div>
      <ProveedoresTable proveedores={proveedores} />
    </div>
  );
}
