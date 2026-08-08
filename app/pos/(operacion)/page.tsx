import { createClient } from "@/lib/supabase/server";
import { getTurnoAbierto } from "@/repositories/cajaTurnosRepository";
import { listOfertas } from "@/repositories/ofertasRepository";
import { listDescuentos } from "@/repositories/descuentosRepository";
import { PantallaVenta } from "@/features/ventas/components/PantallaVenta";

// El layout de app/pos/(operacion) ya garantiza que haya un turno abierto para llegar acá
// (E4-2) y ya renderiza el header (PosTopBar) — E7-4: pantalla real de armado de venta.
export default async function PosHome() {
  const supabase = await createClient();
  const [turno, ofertas, descuentos] = await Promise.all([
    getTurnoAbierto(supabase),
    listOfertas(supabase),
    listDescuentos(supabase),
  ]);

  if (!turno) return null;

  return <PantallaVenta cajaTurnoId={turno.id} ofertas={ofertas} descuentos={descuentos} />;
}
