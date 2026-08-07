import { createClient } from "@/lib/supabase/server";
import { listOfertas } from "@/repositories/ofertasRepository";
import { listProductos } from "@/repositories/productosRepository";
import { OfertaDialog } from "@/features/ofertas/components/OfertaDialog";
import { OfertasTable } from "@/features/ofertas/components/OfertasTable";

export default async function OfertasPage() {
  const supabase = await createClient();
  const [ofertas, productos] = await Promise.all([
    listOfertas(supabase),
    listProductos(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ofertas</h1>
        <OfertaDialog productos={productos} />
      </div>
      <OfertasTable ofertas={ofertas} productos={productos} />
    </div>
  );
}
