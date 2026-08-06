"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { crearUsuario } from "@/features/usuarios/actions";
import { getErrorMessage } from "@/lib/errors";
import type { RolUsuario } from "@/types/database";

export function NuevoUsuarioDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [rol, setRol] = useState<RolUsuario>("cajero");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await crearUsuario({ email, password, nombreCompleto, rol });
      setOpen(false);
      setEmail("");
      setPassword("");
      setNombreCompleto("");
      setRol("cajero");
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo crear el usuario"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <UserPlus className="size-4" />
        Nuevo usuario
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuevo usuario interno</DialogTitle>
            <DialogDescription>
              Crea el acceso y comunicale la contraseña provisoria por fuera del sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nuevo-nombre">Nombre completo</Label>
              <Input
                id="nuevo-nombre"
                required
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nuevo-email">Email</Label>
              <Input
                id="nuevo-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nuevo-password">Contraseña provisoria</Label>
              <Input
                id="nuevo-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nuevo-rol">Rol</Label>
              <Select value={rol} onValueChange={(v) => v && setRol(v)}>
                <SelectTrigger id="nuevo-rol" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cajero">Cajero</SelectItem>
                  <SelectItem value="administrador">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creando..." : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
