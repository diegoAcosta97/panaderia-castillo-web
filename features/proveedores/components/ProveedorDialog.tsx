"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearProveedor, actualizarProveedor } from "@/features/proveedores/actions";
import { getErrorMessage } from "@/lib/errors";
import type { Proveedor } from "@/repositories/proveedoresRepository";

export function ProveedorDialog({
  proveedor,
  onSaved,
}: {
  proveedor?: Proveedor;
  onSaved?: () => void;
}) {
  const esEdicion = !!proveedor;
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState(proveedor?.nombre ?? "");
  const [cuit, setCuit] = useState(proveedor?.cuit ?? "");
  const [telefono, setTelefono] = useState(proveedor?.telefono ?? "");
  const [email, setEmail] = useState(proveedor?.email ?? "");
  const [direccion, setDireccion] = useState(proveedor?.direccion ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const patch = {
      nombre,
      cuit: cuit || null,
      telefono: telefono || null,
      email: email || null,
      direccion: direccion || null,
    };

    try {
      if (proveedor) {
        await actualizarProveedor(proveedor.id, patch);
      } else {
        await crearProveedor(patch);
        setNombre("");
        setCuit("");
        setTelefono("");
        setEmail("");
        setDireccion("");
      }
      setOpen(false);
      onSaved?.();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo guardar el proveedor"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={esEdicion ? "outline" : "default"}
            size={esEdicion ? "icon-sm" : "default"}
          />
        }
      >
        {esEdicion ? (
          <Pencil className="size-4" />
        ) : (
          <>
            <Plus className="size-4" />
            Nuevo proveedor
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{esEdicion ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="proveedor-nombre">Nombre</Label>
            <Input
              id="proveedor-nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="proveedor-cuit">CUIT</Label>
            <Input id="proveedor-cuit" value={cuit} onChange={(e) => setCuit(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="proveedor-telefono">Teléfono</Label>
            <Input
              id="proveedor-telefono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="proveedor-email">Email</Label>
            <Input
              id="proveedor-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="proveedor-direccion">Dirección</Label>
            <Input
              id="proveedor-direccion"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear proveedor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
