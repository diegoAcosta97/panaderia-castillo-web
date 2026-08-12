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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { crearEmpleado, actualizarEmpleado } from "@/features/empleados/actions";
import { getErrorMessage } from "@/lib/errors";
import type { Empleado } from "@/repositories/empleadosRepository";
import type { TipoCobroEmpleado } from "@/types/database";

const ETIQUETA_TIPO_COBRO: Record<TipoCobroEmpleado, string> = {
  por_dia: "Día",
  quincena: "Quincena",
};

export function EmpleadoDialog({
  empleado,
  onSaved,
}: {
  empleado?: Empleado;
  onSaved?: () => void;
}) {
  const esEdicion = !!empleado;
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState(empleado?.nombre ?? "");
  const [tipoCobro, setTipoCobro] = useState<TipoCobroEmpleado>(
    empleado?.tipo_cobro ?? "por_dia",
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (empleado) {
        await actualizarEmpleado(empleado.id, { nombre, tipo_cobro: tipoCobro });
      } else {
        await crearEmpleado({ nombre, tipo_cobro: tipoCobro });
        setNombre("");
        setTipoCobro("por_dia");
      }
      setOpen(false);
      onSaved?.();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo guardar el empleado"));
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
            Nuevo empleado
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{esEdicion ? "Editar empleado" : "Nuevo empleado"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="empleado-nombre">Nombre</Label>
            <Input
              id="empleado-nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="empleado-tipo-cobro">Cobra por</Label>
            <Select
              value={tipoCobro}
              onValueChange={(v) => v && setTipoCobro(v as TipoCobroEmpleado)}
            >
              <SelectTrigger id="empleado-tipo-cobro" className="w-full">
                <SelectValue>
                  {(value: TipoCobroEmpleado) => ETIQUETA_TIPO_COBRO[value] ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="por_dia">Día</SelectItem>
                <SelectItem value="quincena">Quincena</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear empleado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
