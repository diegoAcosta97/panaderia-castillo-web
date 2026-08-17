import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listProductosParaProduccion } from "@/repositories/productosRepository";
import { listEmpleados } from "@/repositories/empleadosRepository";
import { buttonVariants } from "@/components/ui/button";
import { NuevaProduccionForm } from "@/features/produccion/components/NuevaProduccionForm";
import { ProduccionesTable } from "@/features/produccion/components/ProduccionesTable";

// E16: alta + historial de producciones propias, enteramente admin (docs/backlog/16-produccion.md).
export default async function ProduccionPage() {
  const supabase = await createClient();
  const [productos, empleados] = await Promise.all([
    listProductosParaProduccion(supabase),
    listEmpleados(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Producción</h1>
        <Link href="/admin/produccion/control-elaboracion" className={buttonVariants({ variant: "outline" })}>
          <ClipboardList className="size-4" />
          Control de Elaboración
        </Link>
      </div>
      <NuevaProduccionForm productos={productos} empleados={empleados} />
      <ProduccionesTable empleados={empleados} />
    </div>
  );
}
