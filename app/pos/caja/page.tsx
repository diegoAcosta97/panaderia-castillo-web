import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTurnoAbierto } from "@/repositories/cajaTurnosRepository";
import { buttonVariants } from "@/components/ui/button";
import { AperturaTurnoForm } from "@/features/caja/components/AperturaTurnoForm";
import { formatearMoneda } from "@/lib/format";

export default async function CajaPage() {
  const supabase = await createClient();
  const turno = await getTurnoAbierto(supabase);

  if (!turno) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <h1 className="text-2xl font-semibold">Abrir turno de caja</h1>
        <AperturaTurnoForm />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Turno de caja abierto</h1>
      <div className="text-sm text-muted-foreground">
        <p>Abierto: {new Date(turno.fecha_apertura).toLocaleString("es-AR")}</p>
        <p>Efectivo inicial: {formatearMoneda(turno.monto_apertura)}</p>
        {turno.etiqueta_turno && <p>Turno: {turno.etiqueta_turno}</p>}
      </div>
      <Link href="/pos/caja/cierre" className={buttonVariants({ className: "w-fit" })}>
        Cerrar turno
      </Link>
    </div>
  );
}
