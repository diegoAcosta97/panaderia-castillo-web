"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
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
import { abrirTurno } from "@/features/caja/actions";
import { getErrorMessage } from "@/lib/errors";
import { throwIfActionError } from "@/lib/actionResult";

const TURNOS = ["Mañana", "Tarde"];

export function AperturaTurnoForm() {
  const [monto, setMonto] = useState("");
  const [etiqueta, setEtiqueta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!etiqueta) {
      setError("Seleccioná el turno.");
      return;
    }
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
        <Label htmlFor="etiqueta-turno">Turno</Label>
        <Select value={etiqueta} onValueChange={(v) => v && setEtiqueta(v)}>
          <SelectTrigger id="etiqueta-turno" className="w-full">
            <SelectValue placeholder="Seleccionar turno" />
          </SelectTrigger>
          <SelectContent>
            {TURNOS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isLoading}>
        <Wallet className="size-4" />
        {isLoading ? "Abriendo..." : "Abrir turno"}
      </Button>
    </form>
  );
}
