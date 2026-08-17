import { createClient } from "@/lib/supabase/server";
import { listProductos } from "@/repositories/productosRepository";
import { listEmpleados } from "@/repositories/empleadosRepository";
import { listPerfiles } from "@/repositories/perfilesRepository";
import { MovimientosStockTable } from "@/features/movimientos-stock/components/MovimientosStockTable";

// El guard de /admin/** (E2-2) ya bloquea el acceso a un cajero; movimientos_stock_select_admin
// (E3-3) refuerza lo mismo a nivel de RLS si alguien pega la URL con otra sesión.
export default async function MovimientosStockPage() {
  const supabase = await createClient();
  const [productos, empleados, perfiles] = await Promise.all([
    listProductos(supabase),
    listEmpleados(supabase),
    listPerfiles(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold print:hidden">Movimientos de stock</h1>
      <MovimientosStockTable productos={productos} empleados={empleados} perfiles={perfiles} />
    </div>
  );
}
