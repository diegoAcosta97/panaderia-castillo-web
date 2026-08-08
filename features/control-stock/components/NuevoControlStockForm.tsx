"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { finalizarConteo } from "@/features/control-stock/actions";
import { getErrorMessage } from "@/lib/errors";
import type { Producto } from "@/repositories/productosRepository";

// E11-2: `productos` ya viene filtrado a controla_stock = true (RF-9.1). El stock_actual leído
// al renderizar esta página ES el snapshot stock_sistema (RF-9.2) -- se guarda en un ref por
// producto para que no cambie aunque el admin tarde en completar el conteo.
export function NuevoControlStockForm({ productos }: { productos: Producto[] }) {
  const [contados, setContados] = useState<Record<string, string>>(() =>
    Object.fromEntries(productos.map((p) => [p.id, String(p.stock_actual ?? 0)])),
  );
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const filas = useMemo(
    () =>
      productos.map((p) => {
        const stockSistema = p.stock_actual ?? 0;
        const raw = contados[p.id] ?? "";
        const stockContado = raw === "" ? null : Number(raw);
        const diferencia = stockContado === null ? null : stockContado - stockSistema;
        return { producto: p, stockSistema, stockContado, diferencia };
      }),
    [productos, contados],
  );

  const faltanValores = filas.some((f) => f.stockContado === null || Number.isNaN(f.stockContado));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const detalles = filas.map((f) => ({
        productoId: f.producto.id,
        stockSistema: f.stockSistema,
        stockContado: f.stockContado as number,
      }));
      const control = await finalizarConteo(detalles, observaciones);
      router.push(`/admin/control-stock/${control.id}`);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo finalizar el conteo"));
    } finally {
      setIsLoading(false);
    }
  }

  if (productos.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Ningún producto tiene activado &quot;controla stock&quot;, no hay nada para contar.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Stock sistema</TableHead>
            <TableHead>Stock contado</TableHead>
            <TableHead>Diferencia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map(({ producto, stockSistema, diferencia }) => (
            <TableRow key={producto.id}>
              <TableCell>{producto.nombre}</TableCell>
              <TableCell>{stockSistema}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  required
                  className="w-28"
                  value={contados[producto.id] ?? ""}
                  onChange={(e) =>
                    setContados((prev) => ({ ...prev, [producto.id]: e.target.value }))
                  }
                />
              </TableCell>
              <TableCell
                className={
                  diferencia === null
                    ? "text-muted-foreground"
                    : diferencia === 0
                      ? "text-muted-foreground"
                      : "font-medium text-destructive"
                }
              >
                {diferencia === null ? "—" : diferencia > 0 ? `+${diferencia}` : diferencia}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="grid max-w-sm gap-2">
        <Label htmlFor="observaciones-control">Observaciones (opcional)</Label>
        <Input
          id="observaciones-control"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <Button type="submit" disabled={isLoading || faltanValores}>
          <ClipboardCheck className="size-4" />
          {isLoading ? "Finalizando..." : "Finalizar conteo"}
        </Button>
      </div>
    </form>
  );
}
