"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins } from "lucide-react";
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
import { registrarPagoEmpleado } from "@/features/pagos-empleados/actions";
import { getErrorMessage } from "@/lib/errors";
import type { Empleado } from "@/repositories/empleadosRepository";

export function NuevoPagoEmpleadoForm({ empleados }: { empleados: Empleado[] }) {
  const [empleadoId, setEmpleadoId] = useState(empleados[0]?.id ?? "");
  const [monto, setMonto] = useState("");
  const [periodoDesde, setPeriodoDesde] = useState("");
  const [periodoHasta, setPeriodoHasta] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const empleado = empleados.find((e) => e.id === empleadoId);
  const esQuincena = empleado?.tipo_cobro === "quincena";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await registrarPagoEmpleado({
        empleadoId,
        monto: Number(monto),
        periodoDesde: esQuincena ? periodoDesde : undefined,
        periodoHasta: esQuincena ? periodoHasta : undefined,
        observaciones: observaciones || undefined,
      });
      setMonto("");
      setPeriodoDesde("");
      setPeriodoHasta("");
      setObservaciones("");
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo registrar el pago"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="pago-empleado">Empleado</Label>
        <Select value={empleadoId} onValueChange={(v) => v && setEmpleadoId(v)}>
          <SelectTrigger id="pago-empleado" className="w-full">
            <SelectValue>
              {(value: string) => empleados.find((e) => e.id === value)?.nombre ?? value}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {empleados.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="pago-monto">Monto</Label>
        <Input
          id="pago-monto"
          type="number"
          min="0.01"
          step="0.01"
          required
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
      </div>
      {esQuincena && (
        <div className="flex gap-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="pago-periodo-desde">Período desde</Label>
            <Input
              id="pago-periodo-desde"
              type="date"
              required
              value={periodoDesde}
              onChange={(e) => setPeriodoDesde(e.target.value)}
            />
          </div>
          <div className="grid flex-1 gap-2">
            <Label htmlFor="pago-periodo-hasta">Período hasta</Label>
            <Input
              id="pago-periodo-hasta"
              type="date"
              required
              value={periodoHasta}
              onChange={(e) => setPeriodoHasta(e.target.value)}
            />
          </div>
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="pago-observaciones">Observaciones</Label>
        <Input
          id="pago-observaciones"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isLoading || !empleadoId}>
        <HandCoins className="size-4" />
        {isLoading ? "Guardando..." : "Registrar pago"}
      </Button>
    </form>
  );
}
