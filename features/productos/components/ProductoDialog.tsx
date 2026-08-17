"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { crearProducto, actualizarProducto } from "@/features/productos/actions";
import { getErrorMessage } from "@/lib/errors";
import { throwIfActionError } from "@/lib/actionResult";
import type { Categoria } from "@/repositories/categoriasRepository";
import type { Producto } from "@/repositories/productosRepository";
import type { TipoVentaProducto } from "@/types/database";

// Heurística de UX, no una regla del modelo de datos: solo cambia el valor por default de
// "controla stock" al elegir categoría en el alta, el administrador lo puede corregir igual
// (RF-1.3, docs/backlog/03-productos.md#E3-5).
const PALABRA_PANADERIA = /panader/i;

const ETIQUETA_TIPO_VENTA: Record<TipoVentaProducto, string> = {
  unidad: "Unidad",
  peso: "Peso (kg)",
};

export function ProductoDialog({
  categorias,
  producto,
  onSaved,
}: {
  categorias: Categoria[];
  producto?: Producto;
  onSaved?: () => void;
}) {
  const esEdicion = !!producto;
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [categoriaId, setCategoriaId] = useState(
    producto?.categoria_id ?? categorias[0]?.id ?? "",
  );
  const [tipoVenta, setTipoVenta] = useState<TipoVentaProducto>(
    producto?.tipo_venta ?? "unidad",
  );
  const [codigoBarras, setCodigoBarras] = useState(producto?.codigo_barras ?? "");
  const [precio, setPrecio] = useState(producto ? String(producto.precio) : "");
  const [costo, setCosto] = useState(
    producto?.costo != null ? String(producto.costo) : "",
  );
  const [controlaStock, setControlaStock] = useState(producto?.controla_stock ?? true);
  const [stockMinimo, setStockMinimo] = useState(
    producto?.stock_minimo != null ? String(producto.stock_minimo) : "",
  );
  const [stockInicial, setStockInicial] = useState("");
  const [diasVencimiento, setDiasVencimiento] = useState(
    producto?.dias_vencimiento_default != null
      ? String(producto.dias_vencimiento_default)
      : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function handleCategoriaChange(id: string) {
    setCategoriaId(id);
    if (!esEdicion) {
      const categoria = categorias.find((c) => c.id === id);
      setControlaStock(!PALABRA_PANADERIA.test(categoria?.nombre ?? ""));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (producto) {
        throwIfActionError(
          await actualizarProducto(producto.id, {
            nombre,
            categoria_id: categoriaId,
            codigo_barras: codigoBarras,
            precio: Number(precio),
            costo: costo ? Number(costo) : null,
            controla_stock: controlaStock,
            stock_minimo: controlaStock && stockMinimo ? Number(stockMinimo) : null,
            dias_vencimiento_default: diasVencimiento ? Number(diasVencimiento) : null,
          }),
        );
      } else {
        throwIfActionError(
          await crearProducto({
            nombre,
            categoria_id: categoriaId,
            codigo_barras: codigoBarras || null,
            tipo_venta: tipoVenta,
            precio: Number(precio),
            costo: costo ? Number(costo) : null,
            controla_stock: controlaStock,
            stock_minimo: controlaStock && stockMinimo ? Number(stockMinimo) : null,
            stock_inicial: controlaStock && stockInicial ? Number(stockInicial) : null,
            dias_vencimiento_default: diasVencimiento ? Number(diasVencimiento) : null,
          }),
        );
        setNombre("");
        setCodigoBarras("");
        setPrecio("");
        setCosto("");
        setStockMinimo("");
        setStockInicial("");
        setDiasVencimiento("");
      }
      setOpen(false);
      onSaved?.();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo guardar el producto"));
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
            Nuevo producto
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{esEdicion ? "Editar producto" : "Nuevo producto"}</DialogTitle>
            {!esEdicion && (
              <DialogDescription>
                Dejá el código de barras vacío para que se genere uno interno automáticamente.
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="producto-nombre">Nombre</Label>
            <Input
              id="producto-nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="producto-categoria">Categoría</Label>
            <Select value={categoriaId} onValueChange={(v) => v && handleCategoriaChange(v)}>
              <SelectTrigger id="producto-categoria" className="w-full">
                {/* children como función: ver docs/backlog/14-mermas-consumo-interno.md */}
                <SelectValue>
                  {(value: string) => categorias.find((c) => c.id === value)?.nombre ?? value}
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
          </div>

          <div className="grid gap-2">
            <Label htmlFor="producto-tipo-venta">Se vende por</Label>
            <Select
              value={tipoVenta}
              onValueChange={(v) => v && setTipoVenta(v as TipoVentaProducto)}
              disabled={esEdicion}
            >
              <SelectTrigger id="producto-tipo-venta" className="w-full">
                <SelectValue>
                  {(value: TipoVentaProducto) => ETIQUETA_TIPO_VENTA[value] ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unidad">Unidad</SelectItem>
                <SelectItem value="peso">Peso (kg)</SelectItem>
              </SelectContent>
            </Select>
            {esEdicion && (
              <p className="text-xs text-muted-foreground">
                No se puede cambiar después de creado (RF-1.2).
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="producto-codigo">Código de barras</Label>
            <Input
              id="producto-codigo"
              placeholder="Automático si se deja vacío"
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="producto-precio">
              {tipoVenta === "peso" ? "Precio por kg" : "Precio"}
            </Label>
            <Input
              id="producto-precio"
              type="number"
              min="0"
              step="0.01"
              required
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="producto-costo">
              Costo {tipoVenta === "peso" ? "por kg" : ""} (opcional, para calcular margen)
            </Label>
            <Input
              id="producto-costo"
              type="number"
              min="0"
              step="0.01"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="producto-controla-stock"
              checked={controlaStock}
              onCheckedChange={(c) => setControlaStock(c === true)}
            />
            <Label htmlFor="producto-controla-stock">Controla stock</Label>
          </div>

          {controlaStock && !esEdicion && (
            <div className="grid gap-2">
              <Label htmlFor="producto-stock-inicial">Stock inicial</Label>
              <Input
                id="producto-stock-inicial"
                type="number"
                min="0"
                step="0.001"
                placeholder="0"
                value={stockInicial}
                onChange={(e) => setStockInicial(e.target.value)}
              />
            </div>
          )}

          {controlaStock && (
            <div className="grid gap-2">
              <Label htmlFor="producto-stock-minimo">Stock mínimo (alerta de reposición)</Label>
              <Input
                id="producto-stock-minimo"
                type="number"
                min="0"
                step="0.001"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="producto-dias-vencimiento">
              Días de vencimiento (default para etiquetas)
            </Label>
            <Input
              id="producto-dias-vencimiento"
              type="number"
              min="0"
              value={diasVencimiento}
              onChange={(e) => setDiasVencimiento(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
