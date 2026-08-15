import { createClient } from "@/lib/supabase/server";
import { listProductos } from "@/repositories/productosRepository";
import { PantallaPedidos } from "@/features/pedidos-encargo/components/PantallaPedidos";

// El layout de app/pos/(operacion) ya garantiza que haya un turno abierto para llegar acá
// (E4-2), mismo criterio que /pos/gastos y /pos/merma.
export default async function PedidosPage() {
  const supabase = await createClient();
  const productos = await listProductos(supabase);

  return <PantallaPedidos productos={productos} />;
}
