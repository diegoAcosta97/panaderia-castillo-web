import { createClient } from "@/lib/supabase/server";
import { listPerfiles } from "@/repositories/perfilesRepository";
import { NuevoUsuarioDialog } from "@/features/usuarios/components/NuevoUsuarioDialog";
import { UsuariosTable } from "@/features/usuarios/components/UsuariosTable";

export default async function UsuariosPage() {
  const supabase = await createClient();
  const perfiles = await listPerfiles(supabase);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <NuevoUsuarioDialog />
      </div>
      <UsuariosTable perfiles={perfiles} />
    </div>
  );
}
