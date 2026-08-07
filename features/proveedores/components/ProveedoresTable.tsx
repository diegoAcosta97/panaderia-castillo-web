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
import { ProveedorDialog } from "@/features/proveedores/components/ProveedorDialog";
import { actualizarProveedor } from "@/features/proveedores/actions";
import type { Proveedor } from "@/repositories/proveedoresRepository";

export function ProveedoresTable({ proveedores }: { proveedores: Proveedor[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>CUIT</TableHead>
          <TableHead>Teléfono</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Activo</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {proveedores.map((proveedor) => (
          <ProveedorRow key={proveedor.id} proveedor={proveedor} />
        ))}
      </TableBody>
    </Table>
  );
}

function ProveedorRow({ proveedor }: { proveedor: Proveedor }) {
  const [isPending, startTransition] = useTransition();
  const [activo, setActivo] = useState(proveedor.activo);

  function handleActivoChange(nuevoActivo: boolean) {
    setActivo(nuevoActivo);
    startTransition(() => actualizarProveedor(proveedor.id, { activo: nuevoActivo }));
  }

  return (
    <TableRow className={isPending ? "opacity-60" : undefined}>
      <TableCell>{proveedor.nombre}</TableCell>
      <TableCell>{proveedor.cuit || "—"}</TableCell>
      <TableCell>{proveedor.telefono || "—"}</TableCell>
      <TableCell>{proveedor.email || "—"}</TableCell>
      <TableCell>
        <Checkbox
          checked={activo}
          onCheckedChange={(checked) => handleActivoChange(checked === true)}
        />
      </TableCell>
      <TableCell>
        <ProveedorDialog proveedor={proveedor} />
      </TableCell>
    </TableRow>
  );
}
