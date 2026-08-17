import { createClient } from "@/lib/supabase/server";
import { listCategorias } from "@/repositories/categoriasRepository";
import { ProductosTable } from "@/features/productos/components/ProductosTable";

export default async function ProductosPage() {
  const supabase = await createClient();
  const categorias = await listCategorias(supabase);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold print:hidden">Productos</h1>
      <ProductosTable categorias={categorias} />
    </div>
  );
}
