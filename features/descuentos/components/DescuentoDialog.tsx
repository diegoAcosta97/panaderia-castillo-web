"use client";

import { useState } from "react";
import { Plus, Pencil, X } from "lucide-react";
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
import { crearDescuento, actualizarDescuento } from "@/features/descuentos/actions";
import { getErrorMessage } from "@/lib/errors";
import type { Producto } from "@/repositories/productosRepository";
import type { Categoria } from "@/repositories/categoriasRepository";
import type { DescuentoConCondiciones, CondicionInput } from "@/repositories/descuentosRepository";
import type { TipoCondicionDescuento, TipoEfectoDescuento } from "@/types/database";

interface CondicionForm {
  tipo: TipoCondicionDescuento;
  montoMinimo: string;
  productoId: string;
  categoriaId: string;
  cantidadMinima: string;
}

function condicionVacia(): CondicionForm {
  return { tipo: "monto_minimo", montoMinimo: "", productoId: "", categoriaId: "", cantidadMinima: "1" };
}

const ETIQUETA_CONDICION: Record<TipoCondicionDescuento, string> = {
  monto_minimo: "Monto mínimo de la venta",
  producto_incluido: "Incluye producto",
  categoria_incluida: "Incluye categoría",
};

const ETIQUETA_EFECTO: Record<TipoEfectoDescuento, string> = {
  porcentaje: "% del total",
  monto_fijo: "Monto fijo",
};

export function DescuentoDialog({
  productos,
  categorias,
  descuento,
  onSaved,
}: {
  productos: Producto[];
  categorias: Categoria[];
  descuento?: DescuentoConCondiciones;
  onSaved?: () => void;
}) {
  const esEdicion = !!descuento;
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState(descuento?.nombre ?? "");
  const [tipoEfecto, setTipoEfecto] = useState<TipoEfectoDescuento>(
    descuento?.tipo_efecto ?? "porcentaje",
  );
  const [valorEfecto, setValorEfecto] = useState(descuento ? String(descuento.valor_efecto) : "");
  const [fechaInicio, setFechaInicio] = useState(descuento?.fecha_inicio ?? "");
  const [fechaFin, setFechaFin] = useState(descuento?.fecha_fin ?? "");
  const [condiciones, setCondiciones] = useState<CondicionForm[]>(
    descuento
      ? descuento.condiciones.map((c) => ({
          tipo: c.tipo_condicion,
          montoMinimo: c.monto_minimo != null ? String(c.monto_minimo) : "",
          productoId: c.producto_id ?? "",
          categoriaId: c.categoria_id ?? "",
          cantidadMinima: c.cantidad_minima != null ? String(c.cantidad_minima) : "1",
        }))
      : [condicionVacia()],
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function actualizarCondicion(index: number, patch: Partial<CondicionForm>) {
    setCondiciones((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function agregarCondicion() {
    setCondiciones((prev) => [...prev, condicionVacia()]);
  }

  function quitarCondicion(index: number) {
    setCondiciones((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const input = {
      nombre,
      descripcion: null,
      tipo_efecto: tipoEfecto,
      valor_efecto: Number(valorEfecto),
      fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin || null,
      condiciones: condiciones.map(
        (c): CondicionInput => ({
          tipo_condicion: c.tipo,
          monto_minimo: c.tipo === "monto_minimo" ? Number(c.montoMinimo) : null,
          producto_id: c.tipo === "producto_incluido" ? c.productoId : null,
          categoria_id: c.tipo === "categoria_incluida" ? c.categoriaId : null,
          cantidad_minima: c.tipo === "monto_minimo" ? null : Number(c.cantidadMinima || 1),
        }),
      ),
    };

    try {
      if (descuento) {
        await actualizarDescuento(descuento.id, input);
      } else {
        await crearDescuento(input);
        setNombre("");
        setValorEfecto("");
        setFechaInicio("");
        setFechaFin("");
        setCondiciones([condicionVacia()]);
      }
      setOpen(false);
      onSaved?.();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo guardar el descuento"));
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
            Nuevo descuento
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{esEdicion ? "Editar descuento" : "Nuevo descuento"}</DialogTitle>
            <DialogDescription>
              Se aplica automáticamente sobre el total de la venta si se cumplen{" "}
              <strong>todas</strong> las condiciones.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="descuento-nombre">Nombre</Label>
            <Input
              id="descuento-nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Condiciones (todas deben cumplirse)</Label>
            <div className="flex flex-col gap-3">
              {condiciones.map((condicion, index) => (
                <div key={index} className="flex flex-col gap-2 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Select
                      value={condicion.tipo}
                      onValueChange={(v) => v && actualizarCondicion(index, { tipo: v as TipoCondicionDescuento })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {(value: TipoCondicionDescuento) => ETIQUETA_CONDICION[value] ?? value}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ETIQUETA_CONDICION) as TipoCondicionDescuento[]).map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {ETIQUETA_CONDICION[tipo]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => quitarCondicion(index)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>

                  {condicion.tipo === "monto_minimo" && (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Monto mínimo ($)"
                      value={condicion.montoMinimo}
                      onChange={(e) => actualizarCondicion(index, { montoMinimo: e.target.value })}
                    />
                  )}

                  {condicion.tipo === "producto_incluido" && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={condicion.productoId}
                        onValueChange={(v) => v && actualizarCondicion(index, { productoId: v })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {(value: string) =>
                              value ? (productos.find((p) => p.id === value)?.nombre ?? value) : "Producto"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {productos.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0.001"
                        step="0.001"
                        className="w-28"
                        placeholder="Cant. mín."
                        value={condicion.cantidadMinima}
                        onChange={(e) => actualizarCondicion(index, { cantidadMinima: e.target.value })}
                      />
                    </div>
                  )}

                  {condicion.tipo === "categoria_incluida" && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={condicion.categoriaId}
                        onValueChange={(v) => v && actualizarCondicion(index, { categoriaId: v })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {(value: string) =>
                              value ? (categorias.find((c) => c.id === value)?.nombre ?? value) : "Categoría"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {categorias.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0.001"
                        step="0.001"
                        className="w-28"
                        placeholder="Cant. mín."
                        value={condicion.cantidadMinima}
                        onChange={(e) => actualizarCondicion(index, { cantidadMinima: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={agregarCondicion}
              className="w-fit"
            >
              <Plus className="size-4" />
              Agregar condición
            </Button>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="descuento-tipo-efecto">Efecto</Label>
            <Select
              value={tipoEfecto}
              onValueChange={(v) => v && setTipoEfecto(v as TipoEfectoDescuento)}
            >
              <SelectTrigger id="descuento-tipo-efecto" className="w-full">
                <SelectValue>
                  {(value: TipoEfectoDescuento) => ETIQUETA_EFECTO[value] ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="porcentaje">% del total</SelectItem>
                <SelectItem value="monto_fijo">Monto fijo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="descuento-valor-efecto">Valor</Label>
            <Input
              id="descuento-valor-efecto"
              type="number"
              min="0"
              step="0.01"
              required
              value={valorEfecto}
              onChange={(e) => setValorEfecto(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="descuento-fecha-inicio">Vigente desde</Label>
              <Input
                id="descuento-fecha-inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="grid flex-1 gap-2">
              <Label htmlFor="descuento-fecha-fin">Vigente hasta</Label>
              <Input
                id="descuento-fecha-fin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear descuento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
