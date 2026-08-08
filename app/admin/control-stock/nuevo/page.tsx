import { createClient } from "@/lib/supabase/server";
import { listProductosControlaStock } from "@/repositories/productosRepository";
import { NuevoControlStockForm } from "@/features/control-stock/components/NuevoControlStockForm";

export default async function NuevoControlStockPage() {
  const supabase = await createClient();
  const productos = await listProductosControlaStock(supabase);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo control de stock</h1>
        <p className="text-muted-foreground text-sm">
          El &quot;stock sistema&quot; de cada producto es el que tiene ahora mismo. Contá cada
          uno y cargá el resultado -- al finalizar, el conteo queda pendiente de aprobación (no
          se ajusta ningún stock todavía).
        </p>
      </div>
      <NuevoControlStockForm productos={productos} />
    </div>
  );
}
