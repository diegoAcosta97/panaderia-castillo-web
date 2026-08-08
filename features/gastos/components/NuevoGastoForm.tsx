"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { crearGasto } from "@/features/gastos/actions";
import { getErrorMessage } from "@/lib/errors";
import type { Proveedor } from "@/repositories/proveedoresRepository";

export function NuevoGastoForm({ proveedores }: { proveedores: Proveedor[] }) {
  const [proveedorId, setProveedorId] = useState(proveedores[0]?.id ?? "");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await crearGasto({ proveedorId, concepto, monto: Number(monto) });
      setConcepto("");
      setMonto("");
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo registrar el gasto"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="gasto-proveedor">Proveedor</Label>
        <Select value={proveedorId} onValueChange={(v) => v && setProveedorId(v)}>
          <SelectTrigger id="gasto-proveedor" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {proveedores.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="gasto-concepto">Concepto</Label>
        <Input
          id="gasto-concepto"
          required
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="gasto-monto">Monto</Label>
        <Input
          id="gasto-monto"
          type="number"
          min="0.01"
          step="0.01"
          required
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isLoading || !proveedorId}>
        <Receipt className="size-4" />
        {isLoading ? "Guardando..." : "Registrar gasto"}
      </Button>
    </form>
  );
}
