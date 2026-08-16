import { createClient } from "@/lib/supabase/server";
import { listCategorias } from "@/repositories/categoriasRepository";
import { NuevoControlStockForm } from "@/features/control-stock/components/NuevoControlStockForm";

// E11-6: mismo formulario que /admin/control-stock/nuevo (no tiene nada admin-específico) --
// el cajero también puede iniciar y cargar un conteo, queda pendiente de aprobación de un
// administrador igual que antes.
export default async function ControlStockCajeroPage() {
  const supabase = await createClient();
  const categorias = await listCategorias(supabase);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Control de stock</h1>
        <p className="text-muted-foreground text-sm">
          Elegí una categoría para contar sus productos. Contá cada uno y cargá lo que
          efectivamente hay, sin mirar el sistema -- al finalizar, el conteo queda pendiente de
          aprobación con el informe completo para que el administrador lo revise. No se ajusta
          ningún stock todavía.
        </p>
      </div>
      <NuevoControlStockForm categorias={categorias} />
    </div>
  );
}
