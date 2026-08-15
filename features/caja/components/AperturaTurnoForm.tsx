"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { abrirTurno } from "@/features/caja/actions";
import { getErrorMessage } from "@/lib/errors";
import { throwIfActionError } from "@/lib/actionResult";

export function AperturaTurnoForm() {
  const [monto, setMonto] = useState("");
  const [etiqueta, setEtiqueta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      throwIfActionError(await abrirTurno(Number(monto), etiqueta));
      router.push("/pos");
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo abrir el turno"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="monto-apertura">Efectivo inicial</Label>
        <Input
          id="monto-apertura"
          type="number"
          min="0"
          step="0.01"
          required
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="etiqueta-turno">Turno (opcional)</Label>
        <Input
          id="etiqueta-turno"
          placeholder="Mañana / Tarde"
          value={etiqueta}
          onChange={(e) => setEtiqueta(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isLoading}>
        <Wallet className="size-4" />
        {isLoading ? "Abriendo..." : "Abrir turno"}
      </Button>
    </form>
  );
}
