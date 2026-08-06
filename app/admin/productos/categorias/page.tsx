import { createClient } from "@/lib/supabase/server";
import { listCategorias } from "@/repositories/categoriasRepository";
import { NuevaCategoriaDialog } from "@/features/productos/components/NuevaCategoriaDialog";
import { CategoriasTable } from "@/features/productos/components/CategoriasTable";

export default async function CategoriasPage() {
  const supabase = await createClient();
  const categorias = await listCategorias(supabase);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categorías</h1>
        <NuevaCategoriaDialog />
      </div>
      <CategoriasTable categorias={categorias} />
    </div>
  );
}
