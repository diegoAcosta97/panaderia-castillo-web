"use client";

import { useState } from "react";
import { PackagePlus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScannerInput } from "@/features/ventas/components/ScannerInput";
import { useRegistrarIngresoMercaderia } from "@/features/ingreso-mercaderia/hooks/useRegistrarIngresoMercaderia";
import type { Producto } from "@/repositories/productosRepository";
import type { ResultadoIngresoMercaderia } from "@/repositories/ingresoMercaderiaRepository";

interface ItemCargado {
  producto: Producto;
  cantidad: string;
}

// E15-3: el mismo formulario sirve para cajero (/pos/ingresos-mercaderia) y administrador
// (/admin/ingresos-mercaderia/nuevo) -- la diferencia de si queda pendiente de aprobación o se
// aplica al toque la resuelve crear_ingreso_mercaderia según el rol de quien está logueado, acá
// solo se muestra el mensaje que corresponda según `resultado.estado`.
export function FormularioIngresoMercaderia() {
  const [items, setItems] = useState<ItemCargado[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [resultado, setResultado] = useState<ResultadoIngresoMercaderia | null>(null);
  const { registrar, error, isLoading } = useRegistrarIngresoMercaderia();

  function handleSeleccionar(producto: Producto) {
    setItems((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id);
      if (existente) {
        return prev.map((i) =>
          i.producto.id === producto.id
            ? { ...i, cantidad: String(Number(i.cantidad || "0") + 1) }
            : i,
        );
      }
      return [...prev, { producto, cantidad: "1" }];
    });
  }

  function handleCantidadChange(productoId: string, cantidad: string) {
    setItems((prev) => prev.map((i) => (i.producto.id === productoId ? { ...i, cantidad } : i)));
  }

  function handleQuitar(productoId: string) {
    setItems((prev) => prev.filter((i) => i.producto.id !== productoId));
  }

  function handleNuevo() {
    setItems([]);
    setObservaciones("");
    setResultado(null);
  }

  const itemsValidos = items.every((i) => Number(i.cantidad) > 0 && !Number.isNaN(Number(i.cantidad)));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0 || !itemsValidos) return;
    const res = await registrar(
      items.map((i) => ({ productoId: i.producto.id, cantidad: Number(i.cantidad) })),
      observaciones,
    );
    if (res) setResultado(res);
  }

  if (resultado) {
    const aprobado = resultado.estado === "aprobado";
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Ingreso registrado</h2>
        <p className="max-w-md text-sm">
          {aprobado
            ? "El stock ya se actualizó con los productos cargados."
            : "Queda pendiente de aprobación por un administrador -- el stock todavía no se actualizó."}
        </p>
        <Button type="button" variant="outline" className="w-fit" onClick={handleNuevo}>
          <RotateCcw className="size-4" />
          Cargar otro ingreso
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ScannerInput onSeleccionar={handleSeleccionar} />

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Escaneá o buscá los productos que llegaron para agregarlos a la lista.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Cantidad ingresada</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((i) => (
              <TableRow key={i.producto.id}>
                <TableCell>{i.producto.nombre}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    required
                    className="w-28"
                    value={i.cantidad}
                    onChange={(e) => handleCantidadChange(i.producto.id, e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleQuitar(i.producto.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="grid max-w-sm gap-2">
        <Label htmlFor="ingreso-observaciones">Observaciones (opcional)</Label>
        <Input
          id="ingreso-observaciones"
          placeholder="Ej. remito del proveedor"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <Button type="submit" disabled={isLoading || items.length === 0 || !itemsValidos}>
          <PackagePlus className="size-4" />
          {isLoading ? "Registrando..." : "Registrar ingreso"}
        </Button>
      </div>
    </form>
  );
}
