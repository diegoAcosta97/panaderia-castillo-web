import { createClient } from "@/lib/supabase/server";
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

export default async function CajaHistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const { desde, hasta } = await searchParams;
  const supabase = await createClient();
  const turnos = await listTurnos(supabase, { desde, hasta });

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Historial de caja</h1>

      <form className="flex items-end gap-2" action="/admin/caja">
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
            <TableHead>Fecha</TableHead>
            <TableHead>Turno</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Apertura</TableHead>
            <TableHead>Cierre declarado</TableHead>
            <TableHead>Esperado</TableHead>
            <TableHead>Diferencia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {turnos.map((turno) => (
            <TableRow key={turno.id}>
              <TableCell>{turno.fecha}</TableCell>
              <TableCell>{turno.etiqueta_turno || "—"}</TableCell>
              <TableCell>{turno.estado}</TableCell>
              <TableCell>${turno.monto_apertura}</TableCell>
              <TableCell>
                {turno.monto_cierre_declarado != null ? `$${turno.monto_cierre_declarado}` : "—"}
              </TableCell>
              <TableCell>
                {turno.efectivo_esperado != null ? `$${turno.efectivo_esperado}` : "—"}
              </TableCell>
              <TableCell
                className={
                  turno.diferencia != null && turno.diferencia !== 0
                    ? "text-destructive font-medium"
                    : undefined
                }
              >
                {turno.diferencia != null ? `$${turno.diferencia}` : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
