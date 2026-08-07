import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listVentas } from "@/repositories/ventasRepository";
import { listTurnos } from "@/repositories/cajaTurnosRepository";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const ETIQUETA_ESTADO: Record<string, string> = {
  completada: "Completada",
  pendiente_pago: "Pendiente de pago",
  anulada: "Anulada",
};

export default async function VentasHistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ cajaTurnoId?: string; desde?: string; hasta?: string }>;
}) {
  const { cajaTurnoId, desde, hasta } = await searchParams;
  const supabase = await createClient();
  const [ventas, turnos] = await Promise.all([
    listVentas(supabase, { cajaTurnoId, desde, hasta }),
    listTurnos(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Ventas</h1>

      {/* Select nativo: formulario GET plano, ver la misma nota en /admin/gastos. */}
      <form className="flex flex-wrap items-end gap-2" action="/admin/ventas">
        <div className="grid gap-2">
          <Label htmlFor="cajaTurnoId">Turno de caja</Label>
          <select
            id="cajaTurnoId"
            name="cajaTurnoId"
            defaultValue={cajaTurnoId ?? ""}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Todos</option>
            {turnos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fecha} {t.etiqueta_turno ? `— ${t.etiqueta_turno}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="desde">Desde</Label>
          <Input id="desde" type="date" name="desde" defaultValue={desde} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="hasta">Hasta</Label>
          <Input id="hasta" type="date" name="hasta" defaultValue={hasta} />
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N.º</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ventas.map((venta) => (
            <TableRow key={venta.id}>
              <TableCell>{venta.numero_comprobante}</TableCell>
              <TableCell>{new Date(venta.fecha).toLocaleString("es-AR")}</TableCell>
              <TableCell>${venta.total}</TableCell>
              <TableCell>{ETIQUETA_ESTADO[venta.estado] ?? venta.estado}</TableCell>
              <TableCell>
                <Link href={`/admin/ventas/${venta.id}`} className="text-sm underline">
                  Ver
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
