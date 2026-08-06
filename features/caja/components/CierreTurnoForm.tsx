"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cerrarTurno } from "@/features/caja/actions";
import { getErrorMessage } from "@/lib/errors";
import type { CajaTurno } from "@/repositories/cajaTurnosRepository";

export function CierreTurnoForm({
  turno,
  efectivoEsperado,
}: {
  turno: CajaTurno;
  efectivoEsperado: number;
}) {
  const [montoContado, setMontoContado] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const diferencia = montoContado ? Number(montoContado) - efectivoEsperado : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await cerrarTurno(turno.id, Number(montoContado), observaciones);
      router.push("/pos/caja");
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cerrar el turno"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Efectivo esperado:{" "}
        <span className="font-medium text-foreground">${efectivoEsperado.toFixed(2)}</span>
      </p>
      <div className="grid gap-2">
        <Label htmlFor="monto-contado">Efectivo contado</Label>
        <Input
          id="monto-contado"
          type="number"
          min="0"
          step="0.01"
          required
          value={montoContado}
          onChange={(e) => setMontoContado(e.target.value)}
        />
      </div>
      {diferencia !== null && (
        <p
          className={`text-sm ${diferencia === 0 ? "text-muted-foreground" : "text-destructive"}`}
        >
          Diferencia: ${diferencia.toFixed(2)}
        </p>
      )}
      <div className="grid gap-2">
        <Label htmlFor="observaciones">Observaciones (opcional)</Label>
        <Input
          id="observaciones"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Cerrando..." : "Cerrar turno"}
      </Button>
    </form>
  );
}
