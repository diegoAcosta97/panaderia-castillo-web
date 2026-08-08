"use client";

import { useMemo, useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/DataTable";
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
import { NuevoUsuarioDialog } from "@/features/usuarios/components/NuevoUsuarioDialog";
import { useUsuariosTable } from "@/features/usuarios/hooks/useUsuariosTable";
import type { Perfil } from "@/repositories/perfilesRepository";
import type { RolUsuario } from "@/types/database";

function RolCell({ perfil }: { perfil: Perfil }) {
  const { session } = useSession();
  const esUnoMismo = session?.perfil.id === perfil.id;
  const [isPending, startTransition] = useTransition();
  const [rol, setRol] = useState<RolUsuario>(perfil.rol);

  function handleRolChange(nuevoRol: RolUsuario | null) {
    if (!nuevoRol) return;
    setRol(nuevoRol);
    startTransition(() => actualizarUsuario(perfil.id, { rol: nuevoRol }));
  }

  return (
    // Nadie puede degradarse a sí mismo por accidente y quedar sin admin en la sesión.
    <Select value={rol} onValueChange={handleRolChange} disabled={esUnoMismo || isPending}>
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="cajero">Cajero</SelectItem>
        <SelectItem value="administrador">Administrador</SelectItem>
      </SelectContent>
    </Select>
  );
}

function ActivoCell({ perfil }: { perfil: Perfil }) {
  const { session } = useSession();
  const esUnoMismo = session?.perfil.id === perfil.id;
  const [isPending, startTransition] = useTransition();
  const [activo, setActivo] = useState(perfil.activo);

  function handleActivoChange(nuevoActivo: boolean) {
    setActivo(nuevoActivo);
    startTransition(() => actualizarUsuario(perfil.id, { activo: nuevoActivo }));
  }

  return (
    <Checkbox
      checked={activo}
      onCheckedChange={(checked) => handleActivoChange(checked === true)}
      disabled={esUnoMismo || isPending}
    />
  );
}

export function UsuariosTable() {
  const table = useUsuariosTable();

  const columns = useMemo<ColumnDef<Perfil, unknown>[]>(
    () => [
      {
        accessorKey: "nombre_completo",
        header: "Nombre",
        cell: ({ row }) => row.original.nombre_completo || "—",
      },
      {
        accessorKey: "email",
        header: "Email",
      },
      {
        accessorKey: "rol",
        header: "Rol",
        cell: ({ row }) => <RolCell perfil={row.original} />,
      },
      {
        accessorKey: "activo",
        header: "Activo",
        cell: ({ row }) => <ActivoCell perfil={row.original} />,
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <NuevoUsuarioDialog onSaved={table.refetch} />
      </div>
      <DataTable
        columns={columns}
        data={table.data}
        isLoading={table.isLoading}
        pageIndex={table.pageIndex}
        pageSize={table.pageSize}
        totalCount={table.count}
        onPageChange={table.setPageIndex}
        sorting={table.sorting}
        onSortingChange={table.setSorting}
        emptyMessage="No hay usuarios cargados."
      />
    </div>
  );
}
