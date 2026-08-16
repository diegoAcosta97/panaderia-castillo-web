import { createClient } from "@/lib/supabase/server";
import { listCategorias } from "@/repositories/categoriasRepository";
import { NuevoControlStockForm } from "@/features/control-stock/components/NuevoControlStockForm";

export default async function NuevoControlStockPage() {
  const supabase = await createClient();
  const categorias = await listCategorias(supabase);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo control de stock</h1>
        <p className="text-muted-foreground text-sm">
          Elegí una categoría para contar sus productos. Contá cada uno y cargá lo que
          efectivamente hay, sin mirar el sistema -- al finalizar, el conteo queda pendiente de
          aprobación con el informe completo (stock sistema vs. contado) para que el
          administrador lo revise. No se ajusta ningún stock todavía.
        </p>
      </div>
      <NuevoControlStockForm categorias={categorias} />
    </div>
  );
}
