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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { actualizarCategoria } from "@/features/productos/actions";
import type { Categoria } from "@/repositories/categoriasRepository";

export function CategoriasTable({ categorias }: { categorias: Categoria[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Activa</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categorias.map((categoria) => (
          <CategoriaRow key={categoria.id} categoria={categoria} />
        ))}
      </TableBody>
    </Table>
  );
}

function CategoriaRow({ categoria }: { categoria: Categoria }) {
  const [isPending, startTransition] = useTransition();
  const [nombre, setNombre] = useState(categoria.nombre);
  const [activo, setActivo] = useState(categoria.activo);

  function handleNombreBlur() {
    if (nombre.trim() && nombre !== categoria.nombre) {
      startTransition(() => actualizarCategoria(categoria.id, { nombre: nombre.trim() }));
    }
  }

  function handleActivoChange(nuevoActivo: boolean) {
    setActivo(nuevoActivo);
    startTransition(() => actualizarCategoria(categoria.id, { activo: nuevoActivo }));
  }

  return (
    <TableRow className={isPending ? "opacity-60" : undefined}>
      <TableCell>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={handleNombreBlur}
          className="h-8 max-w-64"
        />
      </TableCell>
      <TableCell>
        <Checkbox
          checked={activo}
          onCheckedChange={(checked) => handleActivoChange(checked === true)}
        />
      </TableCell>
    </TableRow>
  );
}
