import { createClient } from "@/lib/supabase/server";
import { listDescuentos } from "@/repositories/descuentosRepository";
import { listProductos } from "@/repositories/productosRepository";
import { listCategorias } from "@/repositories/categoriasRepository";
import { DescuentoDialog } from "@/features/descuentos/components/DescuentoDialog";
import { DescuentosTable } from "@/features/descuentos/components/DescuentosTable";

export default async function DescuentosPage() {
  const supabase = await createClient();
  const [descuentos, productos, categorias] = await Promise.all([
    listDescuentos(supabase),
    listProductos(supabase),
    listCategorias(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Descuentos</h1>
        <DescuentoDialog productos={productos} categorias={categorias} />
      </div>
      <DescuentosTable descuentos={descuentos} productos={productos} categorias={categorias} />
    </div>
  );
}
