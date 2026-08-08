import { createClient } from "@/lib/supabase/server";
import { listProductos } from "@/repositories/productosRepository";
import { OfertasTable } from "@/features/ofertas/components/OfertasTable";

export default async function OfertasPage() {
  const supabase = await createClient();
  const productos = await listProductos(supabase);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Ofertas</h1>
      <OfertasTable productos={productos} />
    </div>
  );
}
