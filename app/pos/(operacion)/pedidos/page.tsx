import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "@/features/auth/services/sessionService";
import { listProductos } from "@/repositories/productosRepository";
import { PantallaPedidos } from "@/features/pedidos-encargo/components/PantallaPedidos";

// El layout de app/pos/(operacion) ya garantiza que haya un turno abierto para llegar acá
// (E4-2), mismo criterio que /pos/gastos y /pos/merma. RF del dueño: el vendedor (cajero) puede
// ver y filtrar el listado de pedidos, pero no exportarlo -- un administrador que visite esta
// misma pantalla conserva la exportación, igual que en /admin/pedidos.
export default async function PedidosPage() {
  const supabase = await createClient();
  const [productos, session] = await Promise.all([listProductos(supabase), getServerSession()]);

  return <PantallaPedidos productos={productos} puedeExportar={session?.rol !== "cajero"} />;
}
