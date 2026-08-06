"use client";

import { useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/features/auth/hooks/useSession";
import { actualizarUsuario } from "@/features/usuarios/actions";
import type { Perfil } from "@/repositories/perfilesRepository";
import type { RolUsuario } from "@/types/database";

export function UsuariosTable({ perfiles }: { perfiles: Perfil[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Activo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {perfiles.map((perfil) => (
          <UsuarioRow key={perfil.id} perfil={perfil} />
        ))}
      </TableBody>
    </Table>
  );
}

function UsuarioRow({ perfil }: { perfil: Perfil }) {
  const { session } = useSession();
  const esUnoMismo = session?.perfil.id === perfil.id;
  const [isPending, startTransition] = useTransition();
  const [rol, setRol] = useState<RolUsuario>(perfil.rol);
  const [activo, setActivo] = useState(perfil.activo);

  function handleRolChange(nuevoRol: RolUsuario | null) {
    if (!nuevoRol) return;
    setRol(nuevoRol);
    startTransition(() => actualizarUsuario(perfil.id, { rol: nuevoRol }));
  }

  function handleActivoChange(nuevoActivo: boolean) {
    setActivo(nuevoActivo);
    startTransition(() => actualizarUsuario(perfil.id, { activo: nuevoActivo }));
  }

  return (
    <TableRow className={isPending ? "opacity-60" : undefined}>
      <TableCell>{perfil.nombre_completo || "—"}</TableCell>
      <TableCell>{perfil.email}</TableCell>
      <TableCell>
        {/* Nadie puede degradarse a sí mismo por accidente y quedar sin admin en la sesión. */}
        <Select value={rol} onValueChange={handleRolChange} disabled={esUnoMismo}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cajero">Cajero</SelectItem>
            <SelectItem value="administrador">Administrador</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Checkbox
          checked={activo}
          onCheckedChange={(checked) => handleActivoChange(checked === true)}
          disabled={esUnoMismo}
        />
      </TableCell>
    </TableRow>
  );
}
