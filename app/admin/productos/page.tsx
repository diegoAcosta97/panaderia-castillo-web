import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listCategorias } from "@/repositories/categoriasRepository";
import { listProductos } from "@/repositories/productosRepository";
import { buttonVariants } from "@/components/ui/button";
import { ProductoDialog } from "@/features/productos/components/ProductoDialog";
import { ProductosTable } from "@/features/productos/components/ProductosTable";

export default async function ProductosPage() {
  const supabase = await createClient();
  const [productos, categorias] = await Promise.all([
    listProductos(supabase),
    listCategorias(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <div className="flex gap-2">
          <Link href="/admin/productos/categorias" className={buttonVariants({ variant: "outline" })}>
            Categorías
          </Link>
          <Link href="/admin/productos/reposicion" className={buttonVariants({ variant: "outline" })}>
            Reposición
          </Link>
          <ProductoDialog categorias={categorias} />
        </div>
      </div>
      <ProductosTable productos={productos} categorias={categorias} />
    </div>
  );
}
