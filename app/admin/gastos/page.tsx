import { createClient } from "@/lib/supabase/server";
import { listGastos } from "@/repositories/gastosRepository";
import { listProveedores } from "@/repositories/proveedoresRepository";
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

export default async function GastosHistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ proveedorId?: string; desde?: string; hasta?: string }>;
}) {
  const { proveedorId, desde, hasta } = await searchParams;
  const supabase = await createClient();
  const [gastos, proveedores] = await Promise.all([
    listGastos(supabase, { proveedorId, desde, hasta }),
    listProveedores(supabase),
  ]);
  const nombreProveedor = (id: string) => proveedores.find((p) => p.id === id)?.nombre ?? "—";
  const total = gastos.reduce((acc, g) => acc + Number(g.monto), 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Gastos</h1>

      {/* Select nativo a propósito: este formulario es un GET plano sin JS, y el Select de
          shadcn (Base UI) no es un <select> real, no viaja como form data. */}
      <form className="flex flex-wrap items-end gap-2" action="/admin/gastos">
        <div className="grid gap-2">
          <Label htmlFor="proveedorId">Proveedor</Label>
          <select
            id="proveedorId"
            name="proveedorId"
            defaultValue={proveedorId ?? ""}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Todos</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
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
            <TableHead>Fecha</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Concepto</TableHead>
            <TableHead>Monto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gastos.map((gasto) => (
            <TableRow key={gasto.id}>
              <TableCell>{new Date(gasto.fecha).toLocaleString("es-AR")}</TableCell>
              <TableCell>{nombreProveedor(gasto.proveedor_id)}</TableCell>
              <TableCell>{gasto.concepto}</TableCell>
              <TableCell>${gasto.monto}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-sm text-muted-foreground">
        Total: <span className="font-medium text-foreground">${total.toFixed(2)}</span> (
        {gastos.length} {gastos.length === 1 ? "gasto" : "gastos"})
      </p>
    </div>
  );
}
