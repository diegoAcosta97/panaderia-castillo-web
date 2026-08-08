import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTurnoAbierto } from "@/repositories/cajaTurnosRepository";
import { listOfertas } from "@/repositories/ofertasRepository";
import { listDescuentos } from "@/repositories/descuentosRepository";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { buttonVariants } from "@/components/ui/button";
import { PantallaVenta } from "@/features/ventas/components/PantallaVenta";

// El layout de app/pos/(operacion) ya garantiza que haya un turno abierto para llegar acá
// (E4-2). E7-4: pantalla real de armado de venta.
export default async function PosHome() {
  const supabase = await createClient();
  const [turno, ofertas, descuentos] = await Promise.all([
    getTurnoAbierto(supabase),
    listOfertas(supabase),
    listDescuentos(supabase),
  ]);

  if (!turno) return null;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b p-4">
        <div className="flex gap-2">
          <Link href="/pos/caja" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Caja
          </Link>
          <Link href="/pos/gastos" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Gastos
          </Link>
          <Link
            href="/pos/etiquetas"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Etiquetas
          </Link>
        </div>
        <LogoutButton />
      </header>
      <PantallaVenta cajaTurnoId={turno.id} ofertas={ofertas} descuentos={descuentos} />
    </div>
  );
}
