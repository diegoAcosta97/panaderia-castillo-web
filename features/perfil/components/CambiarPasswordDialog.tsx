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
import { cambiarPasswordPropia } from "@/features/perfil/actions";
import { getErrorMessage } from "@/lib/errors";
import { throwIfActionError } from "@/lib/actionResult";

export function CambiarPasswordDialog() {
  const [open, setOpen] = useState(false);
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function limpiar() {
    setPasswordActual("");
    setPasswordNueva("");
    setPasswordConfirmar("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (passwordNueva !== passwordConfirmar) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setIsLoading(true);
    try {
      throwIfActionError(await cambiarPasswordPropia(passwordActual, passwordNueva));
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
      <DialogTrigger render={<Button variant="outline" />}>
        <KeyRound className="size-4" />
        Cambiar contraseña
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              Ingresá tu contraseña actual y la nueva contraseña.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="password-actual">Contraseña actual</Label>
              <Input
                id="password-actual"
                type="password"
                autoComplete="current-password"
                required
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password-nueva">Nueva contraseña</Label>
              <Input
                id="password-nueva"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password-confirmar">Confirmar nueva contraseña</Label>
              <Input
                id="password-confirmar"
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
