import { createClient } from "@/lib/supabase/server";
import { listProductos } from "@/repositories/productosRepository";
import { PantallaPedidos } from "@/features/pedidos-encargo/components/PantallaPedidos";

// Mismo componente que /pos/pedidos (no tiene nada específico de cajero) -- así el admin puede
// ver/cargar pedidos por encargo sin cruzar a /pos y quedar con la navegación de vendedor.
export default async function PedidosEncargoAdminPage() {
  const supabase = await createClient();
  const productos = await listProductos(supabase);

  return <PantallaPedidos productos={productos} />;
}
