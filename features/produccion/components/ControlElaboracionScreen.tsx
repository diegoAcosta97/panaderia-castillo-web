"use client";

import { useState } from "react";
import Image from "next/image";
import { Printer } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";
import { imprimir } from "@/lib/print";
import { getErrorMessage } from "@/lib/errors";
import { listFilasControlElaboracion } from "@/repositories/produccionRepository";
import type { FilaControlElaboracion } from "@/repositories/produccionRepository";

// Destino: por ahora un único valor posible (RF del dueño: "más adelante vemos si se agregan más
// opciones") -- ya queda como desplegable para no tener que tocar la UI cuando se agreguen.
const DESTINOS = ["MOSTRADOR"];

// Lista fija pedida por el dueño -- un espacio al lado de cada una para anotar el lote utilizado
// ese mes (se puede completar acá o dejar en blanco para completar a mano en la impresión).
const MATERIAS_PRIMAS = [
  "Almidón de maíz",
  "Azúcar",
  "Azúcar impalpable",
  "Chocolate blanco",
  "Chocolate negro",
  "Coco",
  "Crema de leche",
  "Crocante",
  "Dulce de batata",
  "Dulce de leche",
  "Mermelada de membrillo",
  "Granas",
  "Guindelas",
  "Harina 000",
  "Jalea para brillo",
  "Levadura",
  "Margarina",
  "Sal",
];

function mesActualISO(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function rangoMes(mes: string): { desde: string; hasta: string; etiqueta: string } {
  const [anioStr, mesStr] = mes.split("-");
  const anio = Number(anioStr);
  const mesNum = Number(mesStr);
  const desde = `${mes}-01`;
  const ultimoDia = new Date(anio, mesNum, 0).getDate();
  const hasta = `${mes}-${String(ultimoDia).padStart(2, "0")}`;
  const etiqueta = new Date(anio, mesNum - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
  return { desde, hasta, etiqueta };
}

// E16-7: planilla mensual "Registro de control de elaboración" (docs/backlog/16-produccion.md) --
// solo producciones completadas del mes (RF del dueño). Destino/materias primas/observaciones se
// completan acá antes de imprimir; "Controló" queda vacío a propósito, se completa a mano recién
// con la planilla ya impresa (no es un campo editable en ningún momento).
export function ControlElaboracionScreen({ nombreComercial }: { nombreComercial: string }) {
  const [mes, setMes] = useState(mesActualISO());
  const [filas, setFilas] = useState<FilaControlElaboracion[] | null>(null);
  const [destinos, setDestinos] = useState<Record<number, string>>({});
  const [materiasPrimas, setMateriasPrimas] = useState<Record<string, string>>({});
  const [observaciones, setObservaciones] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { etiqueta } = rangoMes(mes);

  async function generar() {
    setIsLoading(true);
    setError(null);
    try {
      const { desde, hasta } = rangoMes(mes);
      const supabase = createClient();
      const resultado = await listFilasControlElaboracion(supabase, { desde, hasta });
      setFilas(resultado);
      setDestinos(Object.fromEntries(resultado.map((_, i) => [i, DESTINOS[0]])));
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo generar la planilla"));
      setFilas(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-2 print:hidden">
        <div className="grid gap-2">
          <Label htmlFor="control-elaboracion-mes">Mes</Label>
          <Input
            id="control-elaboracion-mes"
            type="month"
            className="w-40"
            value={mes}
            onChange={(e) => {
              setMes(e.target.value);
              setFilas(null);
            }}
          />
        </div>
        <Button type="button" onClick={generar} disabled={isLoading || !mes}>
          {isLoading ? "Generando..." : "Generar planilla"}
        </Button>
        {filas && filas.length > 0 && (
          <Button type="button" variant="outline" onClick={imprimir}>
            <Printer className="size-4" />
            Imprimir / Guardar PDF
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive print:hidden">{error}</p>}

      {filas && filas.length === 0 && (
        <p className="text-sm text-muted-foreground print:hidden">
          No hay producciones completadas en {etiqueta}.
        </p>
      )}

      {filas && filas.length > 0 && (
        <div className="flex flex-col gap-6 print:gap-4">
          <header className="flex flex-col items-center gap-1 text-center">
            <Image
              src="/logo-castillo-gemini.png"
              alt={nombreComercial}
              width={160}
              height={90}
              className="h-auto w-32"
            />
            <h1 className="text-lg font-semibold">Manual de Buenas Prácticas de Manufactura</h1>
            <p className="text-base font-medium">REGISTRO DE CONTROL DE ELABORACIÓN</p>
            <p className="text-sm text-muted-foreground capitalize">{etiqueta}</p>
          </header>

          {/* Pantalla: tabla interactiva (editar Destino), puede scrollear horizontal si hace
              falta -- no importa, es solo para completar antes de imprimir. */}
          <div className="overflow-x-auto print:hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Kg/Unidades producidas</TableHead>
                  <TableHead>T° del medio de cocción</TableHead>
                  <TableHead>T° interna del alimento</TableHead>
                  <TableHead>Tiempo de cocción (min)</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Controló</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f, index) => (
                  <TableRow key={`${f.produccionId}-${f.productoNombre}-${index}`}>
                    <TableCell>
                      {new Date(`${f.fecha}T00:00:00`).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell>{f.productoNombre}</TableCell>
                    <TableCell>{f.cantidad}</TableCell>
                    <TableCell>{f.temperaturaMedioCoccion ?? "—"}</TableCell>
                    <TableCell>{f.temperaturaInternaAlimento ?? "—"}</TableCell>
                    <TableCell>{f.tiempoCoccionMinutos ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={destinos[index] ?? DESTINOS[0]}
                        onValueChange={(v) => v && setDestinos((prev) => ({ ...prev, [index]: v }))}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DESTINOS.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{f.empleadoNombre}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Impresión: tabla de solo lectura, ancho fijo por columna (suma 100%) para que las 9
              columnas entren siempre en el ancho de A4 sin scroll -- el <Table> de shadcn envuelve
              en un div con overflow-x-auto fijo que recorta contenido al imprimir, por eso acá va
              una <table> HTML simple (mismo criterio que Comprobante.tsx/ListadoImprimible.tsx). */}
          <table className="hidden w-full table-fixed border-collapse text-[9px] print:table">
            <thead>
              <tr className="border-b text-left">
                <th className="w-[8%] py-1 pr-1 font-medium">Fecha</th>
                <th className="w-[19%] py-1 pr-1 font-medium">Producto</th>
                <th className="w-[8%] py-1 pr-1 font-medium">Kg/Un.</th>
                <th className="w-[10%] py-1 pr-1 font-medium">T° medio cocción</th>
                <th className="w-[10%] py-1 pr-1 font-medium">T° interna aliment.</th>
                <th className="w-[9%] py-1 pr-1 font-medium">Tiempo (min)</th>
                <th className="w-[11%] py-1 pr-1 font-medium">Destino</th>
                <th className="w-[15%] py-1 pr-1 font-medium">Responsable</th>
                <th className="w-[10%] py-1 font-medium">Controló</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, index) => (
                <tr
                  key={`print-${f.produccionId}-${f.productoNombre}-${index}`}
                  className="border-b border-dashed align-top"
                >
                  <td className="py-1 pr-1">
                    {new Date(`${f.fecha}T00:00:00`).toLocaleDateString("es-AR")}
                  </td>
                  <td className="py-1 pr-1 break-words">{f.productoNombre}</td>
                  <td className="py-1 pr-1">{f.cantidad}</td>
                  <td className="py-1 pr-1">{f.temperaturaMedioCoccion ?? "—"}</td>
                  <td className="py-1 pr-1">{f.temperaturaInternaAlimento ?? "—"}</td>
                  <td className="py-1 pr-1">{f.tiempoCoccionMinutos ?? "—"}</td>
                  <td className="py-1 pr-1">{destinos[index] ?? DESTINOS[0]}</td>
                  <td className="py-1 pr-1 break-words">{f.empleadoNombre}</td>
                  <td className="py-1"></td>
                </tr>
              ))}
            </tbody>
          </table>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase">
              Lotes de materias primas utilizadas
            </h2>
            <div className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2 print:grid-cols-2">
              {MATERIAS_PRIMAS.map((materia) => (
                <div key={materia} className="flex items-baseline gap-2">
                  <Label htmlFor={`materia-${materia}`} className="shrink-0 font-normal">
                    {materia}:
                  </Label>
                  <Input
                    id={`materia-${materia}`}
                    className="h-7 flex-1 rounded-none border-0 border-b border-input px-1 focus-visible:ring-0"
                    value={materiasPrimas[materia] ?? ""}
                    onChange={(e) =>
                      setMateriasPrimas((prev) => ({ ...prev, [materia]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <Label htmlFor="control-elaboracion-observaciones" className="text-sm font-semibold uppercase">
              Observaciones
            </Label>
            <textarea
              id="control-elaboracion-observaciones"
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </section>
        </div>
      )}
    </div>
  );
}
