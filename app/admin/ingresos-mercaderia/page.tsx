import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { IngresosMercaderiaTable } from "@/features/ingreso-mercaderia/components/IngresosMercaderiaTable";

export default function IngresosMercaderiaPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ingresos de mercadería</h1>
        <Link href="/admin/ingresos-mercaderia/nuevo" className={buttonVariants()}>
          Nuevo ingreso
        </Link>
      </div>
      <p className="text-muted-foreground max-w-2xl text-sm">
        Los ingresos cargados por un administrador se aplican al stock automáticamente. Los
        cargados por un cajero quedan &quot;Pendiente de aprobación&quot; hasta que un
        administrador los revisa.
      </p>
      <IngresosMercaderiaTable />
    </div>
  );
}
