"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actualizarConfiguracionNegocio } from "@/features/configuracion/actions";
import { getErrorMessage } from "@/lib/errors";
import { throwIfActionError } from "@/lib/actionResult";
import type { ConfiguracionNegocio } from "@/repositories/configuracionRepository";

export function ConfiguracionForm({ configuracion }: { configuracion: ConfiguracionNegocio }) {
  const [nombreComercial, setNombreComercial] = useState(configuracion.nombre_comercial);
  const [direccion, setDireccion] = useState(configuracion.direccion ?? "");
  const [telefono, setTelefono] = useState(configuracion.telefono ?? "");
  const [cuit, setCuit] = useState(configuracion.cuit ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setGuardado(false);

    try {
      throwIfActionError(
        await actualizarConfiguracionNegocio(configuracion.id, {
          nombre_comercial: nombreComercial,
          direccion: direccion.trim() || null,
          telefono: telefono.trim() || null,
          cuit: cuit.trim() || null,
        }),
      );
      setGuardado(true);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo guardar la configuración"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="config-nombre">Nombre comercial</Label>
        <Input
          id="config-nombre"
          required
          value={nombreComercial}
          onChange={(e) => setNombreComercial(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="config-direccion">Dirección</Label>
        <Input
          id="config-direccion"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="config-telefono">Teléfono</Label>
        <Input
          id="config-telefono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="config-cuit">CUIT</Label>
        <Input id="config-cuit" value={cuit} onChange={(e) => setCuit(e.target.value)} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {guardado && !error && <p className="text-sm text-muted-foreground">Guardado.</p>}
      <Button type="submit" disabled={isLoading || !nombreComercial.trim()}>
        <Save className="size-4" />
        {isLoading ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
