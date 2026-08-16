"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { registrarConteoBloqueoCaja } from "@/repositories/bloqueoCajaRepository";
import { getErrorMessage } from "@/lib/errors";
import type { Producto } from "@/repositories/productosRepository";

// E4-4: a ciegas, mismo criterio que el conteo de control de stock (docs/backlog/11-control-stock.md)
// y que el cierre de caja -- quien cuenta no ve el stock del sistema ni ninguna comparación en
// vivo, solo carga lo que efectivamente ve en el estante.
export function ConteoBloqueoCajaForm({
  turnoId,
  productos,
}: {
  turnoId: string;
  productos: Producto[];
}) {
  const [contados, setContados] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const faltanValores = productos.some((p) => {
    const raw = contados[p.id] ?? "";
    return raw === "" || Number.isNaN(Number(raw));
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      await registrarConteoBloqueoCaja(
        supabase,
        turnoId,
        productos.map((p) => ({ productoId: p.id, cantidad: Number(contados[p.id]) })),
      );
      router.push("/pos/caja/cierre");
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo registrar el conteo"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Stock contado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.nombre}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  required
                  className="w-28"
                  value={contados[p.id] ?? ""}
                  onChange={(e) => setContados((prev) => ({ ...prev, [p.id]: e.target.value }))}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <Button type="submit" disabled={isLoading || faltanValores}>
          <ClipboardCheck className="size-4" />
          {isLoading ? "Registrando..." : "Registrar conteo y continuar"}
        </Button>
      </div>
    </form>
  );
}
