// E6-5: motor de evaluación de ofertas y descuentos. Lógica pura (sin llamadas a Supabase) para
// que el punto de venta (EPIC 7) pueda recalcular en vivo con cada cambio del carrito, y para
// poder testearla de forma aislada. docs/backlog/06-ofertas-descuentos.md

import type { OfertaConItems } from "@/repositories/ofertasRepository";
import type { DescuentoConCondiciones, DescuentoCondicion } from "@/repositories/descuentosRepository";
import type { Producto } from "@/repositories/productosRepository";
import type { MedioPago, TipoBeneficioOferta } from "@/types/database";

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
  // true si había algún descuento que hubiera aplicado, pero no se aplicó porque la venta ya
  // tiene ofertas -- para poder avisarlo en la UI en vez de que el descuento desaparezca sin
  // explicación (ver ResumenVenta).
  descuentosSuprimidosPorOferta: boolean;
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

// Precio de comprar los items del combo por separado (sin el beneficio) -- referencia tanto
// para el cálculo real (evaluarOfertas) como para la advertencia al configurar la oferta
// (OfertaDialog), así ambos usan exactamente la misma cuenta.
export function calcularPrecioNormalCombo(
  items: { producto_id: string; cantidad_requerida: number }[],
  productos: Producto[],
): number {
  return items.reduce(
    (acc, item) => acc + item.cantidad_requerida * precioProducto(productos, item.producto_id),
    0,
  );
}

export function calcularBeneficioPorAplicacion(
  tipoBeneficio: TipoBeneficioOferta,
  valorBeneficio: number,
  precioNormalCombo: number,
): number {
  if (tipoBeneficio === "precio_fijo") {
    return Math.max(0, precioNormalCombo - valorBeneficio);
  }
  if (tipoBeneficio === "descuento_porcentaje") {
    return precioNormalCombo * (valorBeneficio / 100);
  }
  return valorBeneficio;
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

    const precioNormalCombo = calcularPrecioNormalCombo(oferta.items, productos);
    const beneficioPorAplicacion = calcularBeneficioPorAplicacion(
      oferta.tipo_beneficio,
      Number(oferta.valor_beneficio),
      precioNormalCombo,
    );

    // Un combo mal configurado (precio fijo >= precio de comprar por separado, o monto de
    // descuento sin efecto real) no suma nada y no debería aparecer en la venta -- ver
    // advertencia en OfertaDialog para evitar llegar a este caso.
    if (beneficioPorAplicacion <= 0) continue;

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
  medioPagoSeleccionado: MedioPago | undefined,
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
    case "medio_pago":
      // Solo se puede evaluar una vez elegido el medio de pago (PantallaCobro) -- en el carrito
      // (medioPagoSeleccionado undefined) esta condición nunca se cumple, mismo momento en el
      // que hoy se decide el recargo por tarjeta.
      return medioPagoSeleccionado != null && condicion.medio_pago === medioPagoSeleccionado;
  }
}

export function evaluarDescuentos(
  renglones: RenglonCarrito[],
  productos: Producto[],
  descuentos: DescuentoConCondiciones[],
  fecha: Date = new Date(),
  medioPagoSeleccionado?: MedioPago,
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
      condicionCumplida(c, renglones, productos, subtotal, medioPagoSeleccionado),
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

// RF-3.6 (revisado): la oferta se aplica siempre y puede haber más de una por venta; el
// descuento solo se aplica si la venta no tiene ninguna oferta aplicada -- ya no se acumulan
// entre sí. Reemplaza la decisión anterior ("se acumulan, no son excluyentes") registrada en
// docs/data-model.md.
export function evaluarBeneficios(
  renglones: RenglonCarrito[],
  productos: Producto[],
  ofertas: OfertaConItems[],
  descuentos: DescuentoConCondiciones[],
  fecha: Date = new Date(),
  medioPagoSeleccionado?: MedioPago,
): ResultadoBeneficios {
  const ofertasAplicadas = evaluarOfertas(renglones, productos, ofertas, fecha);
  const descuentosElegibles = evaluarDescuentos(
    renglones,
    productos,
    descuentos,
    fecha,
    medioPagoSeleccionado,
  );
  const hayOfertas = ofertasAplicadas.length > 0;
  const descuentosAplicados = hayOfertas ? [] : descuentosElegibles;

  return {
    ofertasAplicadas,
    descuentosAplicados,
    totalOfertas: ofertasAplicadas.reduce((acc, o) => acc + o.montoBeneficio, 0),
    totalDescuentos: descuentosAplicados.reduce((acc, d) => acc + d.montoAplicado, 0),
    descuentosSuprimidosPorOferta: hayOfertas && descuentosElegibles.length > 0,
  };
}
