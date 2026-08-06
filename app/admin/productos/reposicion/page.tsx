import { createClient } from "@/lib/supabase/server";
import { listProductosBajoStock } from "@/repositories/productosRepository";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ReposicionPage() {
  const supabase = await createClient();
  const productos = await listProductosBajoStock(supabase);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">A reponer</h1>
      {productos.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Ningún producto está por debajo de su stock mínimo.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Stock actual</TableHead>
              <TableHead>Stock mínimo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.map((producto) => (
              <TableRow key={producto.id}>
                <TableCell>{producto.nombre}</TableCell>
                <TableCell className="text-destructive font-medium">
                  {producto.stock_actual}
                </TableCell>
                <TableCell>{producto.stock_minimo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
