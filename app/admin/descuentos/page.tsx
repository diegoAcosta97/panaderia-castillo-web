import { createClient } from "@/lib/supabase/server";
import { listProductos } from "@/repositories/productosRepository";
import { listCategorias } from "@/repositories/categoriasRepository";
import { DescuentosTable } from "@/features/descuentos/components/DescuentosTable";

export default async function DescuentosPage() {
  const supabase = await createClient();
  const [productos, categorias] = await Promise.all([
    listProductos(supabase),
    listCategorias(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Descuentos</h1>
      <DescuentosTable productos={productos} categorias={categorias} />
    </div>
  );
}
