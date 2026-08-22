"use client";

import { useMemo, useState } from "react";
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
import { crearOferta, actualizarOferta } from "@/features/ofertas/actions";
import { getErrorMessage } from "@/lib/errors";
import { throwIfActionError } from "@/lib/actionResult";
import { formatearMoneda } from "@/lib/format";
import {
  calcularBeneficioPorAplicacion,
  calcularPrecioNormalCombo,
} from "@/services/beneficiosService";
import type { Producto } from "@/repositories/productosRepository";
import type { OfertaConItems } from "@/repositories/ofertasRepository";
import type { TipoBeneficioOferta } from "@/types/database";

interface ItemForm {
  productoId: string;
  cantidad: string;
}

const ITEMS_VACIOS: ItemForm[] = [
  { productoId: "", cantidad: "1" },
  { productoId: "", cantidad: "1" },
];

function etiquetaProducto(producto: Producto): string {
  return `${producto.nombre} - ${formatearMoneda(producto.precio)}`;
}

const ETIQUETA_BENEFICIO: Record<TipoBeneficioOferta, string> = {
  precio_fijo: "Precio fijo del combo",
  descuento_porcentaje: "% de descuento sobre el combo",
  descuento_monto: "Monto fijo de descuento",
};

export function OfertaDialog({
  productos,
  oferta,
  onSaved,
}: {
  productos: Producto[];
  oferta?: OfertaConItems;
  onSaved?: () => void;
}) {
  const esEdicion = !!oferta;
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState(oferta?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(oferta?.descripcion ?? "");
  const [tipoBeneficio, setTipoBeneficio] = useState<TipoBeneficioOferta>(
    oferta?.tipo_beneficio ?? "precio_fijo",
  );
  const [valorBeneficio, setValorBeneficio] = useState(
    oferta ? String(oferta.valor_beneficio) : "",
  );
  const [maxAplicaciones, setMaxAplicaciones] = useState(
    oferta?.max_aplicaciones_por_venta != null ? String(oferta.max_aplicaciones_por_venta) : "",
  );
  const [fechaInicio, setFechaInicio] = useState(oferta?.fecha_inicio ?? "");
  const [fechaFin, setFechaFin] = useState(oferta?.fecha_fin ?? "");
  const [items, setItems] = useState<ItemForm[]>(
    oferta
      ? oferta.items.map((i) => ({ productoId: i.producto_id, cantidad: String(i.cantidad_requerida) }))
      : ITEMS_VACIOS,
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Guarda el texto de la advertencia en el momento en que se confirmó "igual" -- si después
  // cambia el valor/los items y el texto de la advertencia cambia (o desaparece), deja de
  // coincidir y hay que reconfirmar. Evita un useEffect solo para resetear un booleano.
  const [advertenciaConfirmadaPara, setAdvertenciaConfirmadaPara] = useState<string | null>(null);

  // RF pedido por el dueño: si el valor configurado no genera ningún descuento real (precio
  // fijo >= precio de comprar por separado, o un monto/porcentaje sin efecto), se advierte antes
  // de guardar -- mismo cálculo que evaluarOfertas (services/beneficiosService.ts) para que la
  // advertencia sea exacta. Si se guarda igual, esa oferta nunca se aplicaría en una venta
  // (evaluarOfertas la descarta cuando el beneficio da <= 0).
  const itemsValidos = useMemo(
    () =>
      items
        .filter((item) => item.productoId && Number(item.cantidad) > 0)
        .map((item) => ({ producto_id: item.productoId, cantidad_requerida: Number(item.cantidad) })),
    [items],
  );
  const precioNormalCombo = useMemo(
    () => calcularPrecioNormalCombo(itemsValidos, productos),
    [itemsValidos, productos],
  );
  const advertenciaBeneficio = useMemo(() => {
    if (itemsValidos.length < 1 || !valorBeneficio) return null;
    const beneficio = calcularBeneficioPorAplicacion(
      tipoBeneficio,
      Number(valorBeneficio),
      precioNormalCombo,
    );
    if (beneficio > 0) return null;
    return tipoBeneficio === "precio_fijo"
      ? `Comprando los productos por separado sale ${formatearMoneda(precioNormalCombo)}. Con ese precio fijo el combo no da ningún descuento real.`
      : `Con ese valor, el combo (${formatearMoneda(precioNormalCombo)} por separado) no da ningún descuento real.`;
  }, [itemsValidos, precioNormalCombo, tipoBeneficio, valorBeneficio]);
  const advertenciaConfirmada =
    advertenciaBeneficio !== null && advertenciaConfirmadaPara === advertenciaBeneficio;

  function actualizarItem(index: number, patch: Partial<ItemForm>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function agregarItem() {
    setItems((prev) => [...prev, { productoId: "", cantidad: "1" }]);
  }

  function quitarItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (advertenciaBeneficio && !advertenciaConfirmada) return;
    setIsLoading(true);
    setError(null);

    const input = {
      nombre,
      descripcion: descripcion || null,
      tipo_beneficio: tipoBeneficio,
      valor_beneficio: Number(valorBeneficio),
      max_aplicaciones_por_venta: maxAplicaciones ? Number(maxAplicaciones) : null,
      fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin || null,
      items: items
        .filter((item) => item.productoId)
        .map((item) => ({ producto_id: item.productoId, cantidad_requerida: Number(item.cantidad) })),
    };

    try {
      if (oferta) {
        throwIfActionError(await actualizarOferta(oferta.id, input));
      } else {
        throwIfActionError(await crearOferta(input));
        setNombre("");
        setDescripcion("");
        setValorBeneficio("");
        setMaxAplicaciones("");
        setFechaInicio("");
        setFechaFin("");
        setItems(ITEMS_VACIOS);
        setAdvertenciaConfirmadaPara(null);
      }
      setOpen(false);
      onSaved?.();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo guardar la oferta"));
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
            Nueva oferta
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{esEdicion ? "Editar oferta" : "Nueva oferta"}</DialogTitle>
            <DialogDescription>
              Uno o más productos que, juntos en las cantidades indicadas, disparan el beneficio
              (ej. 1 docena de facturas a $10.000, o 1 pan + 1 gaseosa con descuento).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="oferta-nombre">Nombre</Label>
            <Input
              id="oferta-nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Productos del combo</Label>
            <div className="flex flex-col gap-2">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={item.productoId}
                    onValueChange={(v) => v && actualizarItem(index, { productoId: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value: string) => {
                          if (!value) return "Producto";
                          const producto = productos.find((p) => p.id === value);
                          return producto ? etiquetaProducto(producto) : value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {productos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {etiquetaProducto(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    className="w-24"
                    value={item.cantidad}
                    onChange={(e) => actualizarItem(index, { cantidad: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => quitarItem(index)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={agregarItem} className="w-fit">
              <Plus className="size-4" />
              Agregar producto
            </Button>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="oferta-tipo-beneficio">Beneficio</Label>
            <Select
              value={tipoBeneficio}
              onValueChange={(v) => v && setTipoBeneficio(v as TipoBeneficioOferta)}
            >
              <SelectTrigger id="oferta-tipo-beneficio" className="w-full">
                <SelectValue>
                  {(value: TipoBeneficioOferta) => ETIQUETA_BENEFICIO[value] ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ETIQUETA_BENEFICIO) as TipoBeneficioOferta[]).map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {ETIQUETA_BENEFICIO[tipo]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="oferta-valor-beneficio">Valor</Label>
            <Input
              id="oferta-valor-beneficio"
              type="number"
              min="0"
              step="0.01"
              required
              value={valorBeneficio}
              onChange={(e) => setValorBeneficio(e.target.value)}
            />
          </div>

          {advertenciaBeneficio && (
            <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p>{advertenciaBeneficio}</p>
              {advertenciaConfirmada ? (
                <p className="text-muted-foreground">
                  Se va a guardar igual. Cambiá el valor o los productos del combo para sacar esta
                  advertencia.
                </p>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => setAdvertenciaConfirmadaPara(advertenciaBeneficio)}
                >
                  Guardar de todas formas
                </Button>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="oferta-max-aplicaciones">
              Máximo de veces por venta (vacío = sin límite)
            </Label>
            <Input
              id="oferta-max-aplicaciones"
              type="number"
              min="1"
              value={maxAplicaciones}
              onChange={(e) => setMaxAplicaciones(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="oferta-fecha-inicio">Vigente desde</Label>
              <Input
                id="oferta-fecha-inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="grid flex-1 gap-2">
              <Label htmlFor="oferta-fecha-fin">Vigente hasta</Label>
              <Input
                id="oferta-fecha-fin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="submit"
              disabled={isLoading || (!!advertenciaBeneficio && !advertenciaConfirmada)}
            >
              {isLoading ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear oferta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
