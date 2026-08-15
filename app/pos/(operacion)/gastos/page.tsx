import { createClient } from "@/lib/supabase/server";
import { getTurnoAbierto } from "@/repositories/cajaTurnosRepository";
import { listGastosPorTurno } from "@/repositories/gastosRepository";
import { listProveedores } from "@/repositories/proveedoresRepository";
import { NuevoGastoForm } from "@/features/gastos/components/NuevoGastoForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearMoneda } from "@/lib/format";

// El layout de app/pos/(operacion) ya garantiza que haya un turno abierto para llegar acá
// (E4-2).
export default async function GastosPage() {
  const supabase = await createClient();
  const [turno, proveedores] = await Promise.all([
    getTurnoAbierto(supabase),
    listProveedores(supabase),
  ]);
  const gastos = turno ? await listGastosPorTurno(supabase, turno.id) : [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Gastos del turno</h1>
      <NuevoGastoForm proveedores={proveedores} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Concepto</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Monto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gastos.map((gasto) => (
            <TableRow key={gasto.id}>
              <TableCell>{gasto.concepto}</TableCell>
              <TableCell>
                {proveedores.find((p) => p.id === gasto.proveedor_id)?.nombre ?? "—"}
              </TableCell>
              <TableCell>{formatearMoneda(gasto.monto)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
