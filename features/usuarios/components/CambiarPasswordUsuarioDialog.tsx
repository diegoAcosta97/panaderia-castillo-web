"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cambiarPasswordUsuario } from "@/features/usuarios/actions";
import { getErrorMessage } from "@/lib/errors";
import { throwIfActionError } from "@/lib/actionResult";
import type { Perfil } from "@/repositories/perfilesRepository";

// Solo pide la nueva contraseña (no la actual): quien la carga acá es el administrador, no el
// dueño de la cuenta -- mismo criterio que crearUsuario (contraseña provisoria comunicada por
// fuera del sistema).
export function CambiarPasswordUsuarioDialog({ perfil }: { perfil: Perfil }) {
  const [open, setOpen] = useState(false);
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function limpiar() {
    setPasswordNueva("");
    setPasswordConfirmar("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (passwordNueva !== passwordConfirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);
    try {
      throwIfActionError(await cambiarPasswordUsuario(perfil.id, passwordNueva));
      setOpen(false);
      limpiar();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cambiar la contraseña"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nuevo) => {
        setOpen(nuevo);
        if (!nuevo) limpiar();
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" title="Cambiar contraseña" />}>
        <KeyRound className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              Nueva contraseña para {perfil.nombre_completo || perfil.email}. Comunicásela por
              fuera del sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="usuario-password-nueva">Nueva contraseña</Label>
              <Input
                id="usuario-password-nueva"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="usuario-password-confirmar">Confirmar nueva contraseña</Label>
              <Input
                id="usuario-password-confirmar"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={passwordConfirmar}
                onChange={(e) => setPasswordConfirmar(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Cambiar contraseña"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
