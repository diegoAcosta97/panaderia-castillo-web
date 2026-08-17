"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { completarProduccion } from "@/features/produccion/actions";
import { getErrorMessage } from "@/lib/errors";
import { throwIfActionError } from "@/lib/actionResult";
import type { ProduccionItem } from "@/repositories/produccionRepository";
import type { Producto } from "@/repositories/productosRepository";

interface FilaForm {
  productoId: string;
  cantidadPedida: number;
  cantidadProducida: string;
  // E16-9: obligatorios cuando cantidadProducida > 0 (BPM, RF del dueño) -- solo se ven acá (al
  // completar) y en la planilla mensual/el detalle de la producción, nunca en el resto de las
  // pantallas.
  temperaturaMedioCoccion: string;
  temperaturaInternaAlimento: string;
  tiempoCoccionMinutos: string;
}

function filaVacia(item: { producto_id: string; cantidad_pedida: number }): FilaForm {
  return {
    productoId: item.producto_id,
    cantidadPedida: item.cantidad_pedida,
    cantidadProducida: String(item.cantidad_pedida),
    temperaturaMedioCoccion: "",
    temperaturaInternaAlimento: "",
    tiempoCoccionMinutos: "",
  };
}

// E16-4: ratifica lo realmente producido -- arranca con cantidad_pedida como valor sugerido (lo
// más común es que coincida) y el admin lo corrige donde hubo faltante o sobra. También se puede
// agregar un producto que no estaba planificado (cantidadPedida = 0 en ese caso).
export function CompletarProduccionForm({
  produccionId,
  itemsPlanificados,
  productosPlanificados,
  productosDisponibles,
}: {
  produccionId: string;
  itemsPlanificados: ProduccionItem[];
  productosPlanificados: Producto[];
  productosDisponibles: Producto[];
}) {
  const [filas, setFilas] = useState<FilaForm[]>(itemsPlanificados.map(filaVacia));
  const [productoNuevoId, setProductoNuevoId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const nombreProducto = (productoId: string) =>
    productosPlanificados.find((p) => p.id === productoId)?.nombre ??
    productosDisponibles.find((p) => p.id === productoId)?.nombre ??
    productoId;

  const productosParaAgregar = useMemo(
    () => productosDisponibles.filter((p) => !filas.some((f) => f.productoId === p.id)),
    [productosDisponibles, filas],
  );

  function actualizarFila(index: number, patch: Partial<FilaForm>) {
    setFilas((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function quitarFila(index: number) {
    setFilas((prev) => prev.filter((_, i) => i !== index));
  }

  function agregarProducto() {
    if (!productoNuevoId) return;
    setFilas((prev) => [...prev, filaVacia({ producto_id: productoNuevoId, cantidad_pedida: 0 })]);
    setProductoNuevoId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      throwIfActionError(
        await completarProduccion(
          produccionId,
          filas.map((f) => ({
            productoId: f.productoId,
            cantidadProducida: Number(f.cantidadProducida),
            temperaturaMedioCoccion:
              f.temperaturaMedioCoccion === "" ? null : Number(f.temperaturaMedioCoccion),
            temperaturaInternaAlimento:
              f.temperaturaInternaAlimento === "" ? null : Number(f.temperaturaInternaAlimento),
            tiempoCoccionMinutos:
              f.tiempoCoccionMinutos === "" ? null : Number(f.tiempoCoccionMinutos),
          })),
        ),
      );
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo completar la producción"));
    } finally {
      setIsLoading(false);
    }
  }

  function numeroValido(valor: string, minimo: number) {
    return valor !== "" && Number.isFinite(Number(valor)) && Number(valor) >= minimo;
  }

  const hayValoresInvalidos = filas.some((f) => {
    if (!numeroValido(f.cantidadProducida, 0)) return true;
    if (Number(f.cantidadProducida) <= 0) return false;
    // Con algo producido, los tres datos de cocción son obligatorios (BPM, RF del dueño).
    return (
      !numeroValido(f.temperaturaMedioCoccion, -Infinity) ||
      !numeroValido(f.temperaturaInternaAlimento, -Infinity) ||
      !numeroValido(f.tiempoCoccionMinutos, 1)
    );
  });

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Cantidad pedida</TableHead>
              <TableHead>Cantidad producida</TableHead>
              <TableHead>T° del medio de cocción</TableHead>
              <TableHead>T° interna del alimento</TableHead>
              <TableHead>Tiempo de cocción (min)</TableHead>
              <TableHead>Diferencia</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((f, index) => {
              const producida = Number(f.cantidadProducida);
              const diferencia = Number.isNaN(producida) ? null : producida - f.cantidadPedida;
              const requiereCoccion = Number.isFinite(producida) && producida > 0;
              return (
                <TableRow key={f.productoId}>
                  <TableCell>
                    {nombreProducto(f.productoId)}
                    {f.cantidadPedida === 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">(no planificado)</span>
                    )}
                  </TableCell>
                  <TableCell>{f.cantidadPedida}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      className="h-8 w-24"
                      value={f.cantidadProducida}
                      onChange={(e) => actualizarFila(index, { cantidadProducida: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.1"
                      required={requiereCoccion}
                      disabled={!requiereCoccion}
                      placeholder={requiereCoccion ? "°C" : "—"}
                      className="h-8 w-24"
                      value={f.temperaturaMedioCoccion}
                      onChange={(e) => actualizarFila(index, { temperaturaMedioCoccion: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.1"
                      required={requiereCoccion}
                      disabled={!requiereCoccion}
                      placeholder={requiereCoccion ? "°C" : "—"}
                      className="h-8 w-24"
                      value={f.temperaturaInternaAlimento}
                      onChange={(e) =>
                        actualizarFila(index, { temperaturaInternaAlimento: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      required={requiereCoccion}
                      disabled={!requiereCoccion}
                      placeholder={requiereCoccion ? "min" : "—"}
                      className="h-8 w-24"
                      value={f.tiempoCoccionMinutos}
                      onChange={(e) => actualizarFila(index, { tiempoCoccionMinutos: e.target.value })}
                    />
                  </TableCell>
                  <TableCell
                    className={
                      diferencia === null || diferencia === 0
                        ? "text-muted-foreground"
                        : "font-medium text-destructive"
                    }
                  >
                    {diferencia === null ? "—" : diferencia > 0 ? `+${diferencia}` : diferencia}
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => quitarFila(index)}>
                      <X className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {productosParaAgregar.length > 0 && (
        <div className="flex items-end gap-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="produccion-producto-nuevo">Agregar producto no planificado</Label>
            <Select value={productoNuevoId} onValueChange={(v) => v && setProductoNuevoId(v)}>
              <SelectTrigger id="produccion-producto-nuevo" className="w-full">
                <SelectValue>
                  {(value: string) =>
                    value ? (productosParaAgregar.find((p) => p.id === value)?.nombre ?? value) : "Producto"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {productosParaAgregar.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={agregarProducto} disabled={!productoNuevoId}>
            <Plus className="size-4" />
            Agregar
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-fit" disabled={isLoading || filas.length === 0 || hayValoresInvalidos}>
        <CircleCheck className="size-4" />
        {isLoading ? "Confirmando..." : "Confirmar producción"}
      </Button>
    </form>
  );
}
