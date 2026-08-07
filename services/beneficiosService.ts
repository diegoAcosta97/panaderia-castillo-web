// E6-5: motor de evaluación de ofertas y descuentos. Lógica pura (sin llamadas a Supabase) para
// que el punto de venta (EPIC 7) pueda recalcular en vivo con cada cambio del carrito, y para
// poder testearla de forma aislada. docs/backlog/06-ofertas-descuentos.md

import type { OfertaConItems } from "@/repositories/ofertasRepository";
import type { DescuentoConCondiciones, DescuentoCondicion } from "@/repositories/descuentosRepository";
import type { Producto } from "@/repositories/productosRepository";

export interface RenglonCarrito {
  productoId: string;
  cantidad: number;
}

export interface OfertaAplicada {
  oferta: OfertaConItems;
  vecesAplicada: number;
  montoBeneficio: number;
}

export interface DescuentoAplicado {
  descuento: DescuentoConCondiciones;
  montoAplicado: number;
}

export interface ResultadoBeneficios {
  ofertasAplicadas: OfertaAplicada[];
  descuentosAplicados: DescuentoAplicado[];
  totalOfertas: number;
  totalDescuentos: number;
}

interface Vigencia {
  activo: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

function estaVigente(registro: Vigencia, fecha: Date): boolean {
  if (!registro.activo) return false;
  const hoy = fecha.toISOString().slice(0, 10);
  if (registro.fecha_inicio && hoy < registro.fecha_inicio) return false;
  if (registro.fecha_fin && hoy > registro.fecha_fin) return false;
  return true;
}

function cantidadEnCarrito(renglones: RenglonCarrito[], productoId: string): number {
  return renglones
    .filter((r) => r.productoId === productoId)
    .reduce((acc, r) => acc + r.cantidad, 0);
}

function precioProducto(productos: Producto[], productoId: string): number {
  return productos.find((p) => p.id === productoId)?.precio ?? 0;
}

function categoriaProducto(productos: Producto[], productoId: string): string | undefined {
  return productos.find((p) => p.id === productoId)?.categoria_id;
}

export function evaluarOfertas(
  renglones: RenglonCarrito[],
  productos: Producto[],
  ofertas: OfertaConItems[],
  fecha: Date = new Date(),
): OfertaAplicada[] {
  const aplicadas: OfertaAplicada[] = [];

  for (const oferta of ofertas) {
    if (!estaVigente(oferta, fecha)) continue;
    if (oferta.items.length < 2) continue;

    const vecesPosibles = Math.min(
      ...oferta.items.map((item) =>
        Math.floor(cantidadEnCarrito(renglones, item.producto_id) / item.cantidad_requerida),
      ),
    );
    if (!Number.isFinite(vecesPosibles) || vecesPosibles <= 0) continue;

    const vecesAplicada = oferta.max_aplicaciones_por_venta
      ? Math.min(vecesPosibles, oferta.max_aplicaciones_por_venta)
      : vecesPosibles;
    if (vecesAplicada <= 0) continue;

    const precioNormalCombo = oferta.items.reduce(
      (acc, item) => acc + item.cantidad_requerida * precioProducto(productos, item.producto_id),
      0,
    );

    let beneficioPorAplicacion: number;
    if (oferta.tipo_beneficio === "precio_fijo") {
      beneficioPorAplicacion = Math.max(0, precioNormalCombo - Number(oferta.valor_beneficio));
    } else if (oferta.tipo_beneficio === "descuento_porcentaje") {
      beneficioPorAplicacion = precioNormalCombo * (Number(oferta.valor_beneficio) / 100);
    } else {
      beneficioPorAplicacion = Number(oferta.valor_beneficio);
    }

    aplicadas.push({
      oferta,
      vecesAplicada,
      montoBeneficio: vecesAplicada * beneficioPorAplicacion,
    });
  }

  return aplicadas;
}

function condicionCumplida(
  condicion: DescuentoCondicion,
  renglones: RenglonCarrito[],
  productos: Producto[],
  subtotal: number,
): boolean {
  switch (condicion.tipo_condicion) {
    case "monto_minimo":
      return subtotal >= Number(condicion.monto_minimo ?? 0);
    case "producto_incluido":
      return (
        cantidadEnCarrito(renglones, condicion.producto_id!) >=
        Number(condicion.cantidad_minima ?? 1)
      );
    case "categoria_incluida": {
      const cantidad = renglones
        .filter((r) => categoriaProducto(productos, r.productoId) === condicion.categoria_id)
        .reduce((acc, r) => acc + r.cantidad, 0);
      return cantidad >= Number(condicion.cantidad_minima ?? 1);
    }
  }
}

export function evaluarDescuentos(
  renglones: RenglonCarrito[],
  productos: Producto[],
  descuentos: DescuentoConCondiciones[],
  fecha: Date = new Date(),
): DescuentoAplicado[] {
  const subtotal = renglones.reduce(
    (acc, r) => acc + r.cantidad * precioProducto(productos, r.productoId),
    0,
  );
  const aplicados: DescuentoAplicado[] = [];

  for (const descuento of descuentos) {
    if (!estaVigente(descuento, fecha)) continue;
    if (descuento.condiciones.length === 0) continue;

    const cumpleTodas = descuento.condiciones.every((c) =>
      condicionCumplida(c, renglones, productos, subtotal),
    );
    if (!cumpleTodas) continue;

    const montoAplicado =
      descuento.tipo_efecto === "porcentaje"
        ? subtotal * (Number(descuento.valor_efecto) / 100)
        : Number(descuento.valor_efecto);

    aplicados.push({ descuento, montoAplicado });
  }

  return aplicados;
}

// RF-3.6: ofertas y descuentos se acumulan (no son excluyentes entre sí), ambos calculados
// sobre el mismo subtotal original — ver docs/data-model.md, decisiones confirmadas.
export function evaluarBeneficios(
  renglones: RenglonCarrito[],
  productos: Producto[],
  ofertas: OfertaConItems[],
  descuentos: DescuentoConCondiciones[],
  fecha: Date = new Date(),
): ResultadoBeneficios {
  const ofertasAplicadas = evaluarOfertas(renglones, productos, ofertas, fecha);
  const descuentosAplicados = evaluarDescuentos(renglones, productos, descuentos, fecha);

  return {
    ofertasAplicadas,
    descuentosAplicados,
    totalOfertas: ofertasAplicadas.reduce((acc, o) => acc + o.montoBeneficio, 0),
    totalDescuentos: descuentosAplicados.reduce((acc, d) => acc + d.montoAplicado, 0),
  };
}
