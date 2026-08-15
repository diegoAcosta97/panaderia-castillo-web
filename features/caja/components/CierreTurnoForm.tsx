"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cerrarTurno } from "@/features/caja/actions";
import { getErrorMessage } from "@/lib/errors";
import { throwIfActionError } from "@/lib/actionResult";
import type { CajaTurno } from "@/repositories/cajaTurnosRepository";

// A propósito, el cajero NO ve acá "efectivo esperado" ni la diferencia en vivo -- mismo
// criterio que el conteo de stock a ciegas: si los viera, terminaría ajustando el contado para
// que "cierre" en vez de reportar lo que efectivamente hay en la caja. cerrar_turno calcula la
// diferencia igual, server-side, para el informe que ve el admin.
export function CierreTurnoForm({ turno }: { turno: CajaTurno }) {
  const [montoContado, setMontoContado] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      throwIfActionError(await cerrarTurno(turno.id, Number(montoContado), observaciones));
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
        <Lock className="size-4" />
        {isLoading ? "Cerrando..." : "Cerrar turno"}
      </Button>
    </form>
  );
}
