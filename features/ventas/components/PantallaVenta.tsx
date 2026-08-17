"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleCheck, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScannerInput } from "@/features/ventas/components/ScannerInput";
import { PesoDialog } from "@/features/ventas/components/PesoDialog";
import { Carrito } from "@/features/ventas/components/Carrito";
import { ResumenVenta } from "@/features/ventas/components/ResumenVenta";
import { PantallaCobro } from "@/features/ventas/components/PantallaCobro";
import { useCarrito } from "@/features/ventas/hooks/useCarrito";
import { useResumenVenta } from "@/features/ventas/hooks/useResumenVenta";
import { CargarPedidoDialog } from "@/features/pedidos-encargo/components/CargarPedidoDialog";
import type { PedidoCargado } from "@/features/pedidos-encargo/components/CargarPedidoDialog";
import type { Producto } from "@/repositories/productosRepository";
import type { OfertaConItems } from "@/repositories/ofertasRepository";
import type { DescuentoConCondiciones } from "@/repositories/descuentosRepository";
import { formatearMoneda } from "@/lib/format";

export function PantallaVenta({
  cajaTurnoId,
  ofertas,
  descuentos,
}: {
  cajaTurnoId: string;
  ofertas: OfertaConItems[];
  descuentos: DescuentoConCondiciones[];
}) {
  const { renglones, agregarProducto, actualizarCantidad, actualizarCantidadYPrecio, quitarRenglon, vaciar } =
    useCarrito();
  const [productoPesoPendiente, setProductoPesoPendiente] = useState<Producto | null>(null);
  const [paso, setPaso] = useState<"carrito" | "cobro">("carrito");
  const [pedidoActivo, setPedidoActivo] = useState<{
    id: string;
    clienteNombre: string;
    senaTotal: number;
  } | null>(null);
  const [ultimaVenta, setUltimaVenta] = useState<{
    ventaId: string;
    numeroComprobante: number;
  } | null>(null);
  const resumen = useResumenVenta(renglones, ofertas, descuentos);

  function handleCargarPedido(pedido: PedidoCargado) {
    vaciar();
    for (const item of pedido.items) agregarProducto(item.producto, item.cantidad);
    setPedidoActivo({
      id: pedido.pedidoId,
      clienteNombre: pedido.clienteNombre,
      senaTotal: pedido.senaTotal,
    });
  }

  function handleQuitarPedido() {
    vaciar();
    setPedidoActivo(null);
  }

  function handleSeleccionar(producto: Producto) {
    if (producto.tipo_venta === "peso") {
      setProductoPesoPendiente(producto);
    } else {
      agregarProducto(producto, 1);
    }
  }

  function confirmarPeso(peso: number, precioUnitario?: number) {
    if (productoPesoPendiente) {
      agregarProducto(productoPesoPendiente, peso, precioUnitario);
      setProductoPesoPendiente(null);
    }
  }

  function handleConfirmada(ventaId: string, numeroComprobante: number) {
    setUltimaVenta({ ventaId, numeroComprobante });
    vaciar();
    setPedidoActivo(null);
    setPaso("carrito");
  }

  if (paso === "cobro") {
    return (
      <PantallaCobro
        cajaTurnoId={cajaTurnoId}
        renglones={renglones}
        ofertas={ofertas}
        descuentos={descuentos}
        pedidoActivo={pedidoActivo}
        onCancelar={() => setPaso("carrito")}
        onConfirmada={handleConfirmada}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      {ultimaVenta && (
        <p className="flex items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/10 p-3 text-sm">
          <span className="flex items-center gap-2">
            <CircleCheck className="size-4 text-success" />
            Venta confirmada — comprobante N.º {ultimaVenta.numeroComprobante}
          </span>
          <Link
            href={`/pos/comprobante/${ultimaVenta.ventaId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Ver / imprimir
          </Link>
        </p>
      )}

      {pedidoActivo && (
        <p className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <span>
            Pedido cargado: <span className="font-medium">{pedidoActivo.clienteNombre}</span>
            {pedidoActivo.senaTotal > 0 &&
              ` — seña ya pagada: ${formatearMoneda(pedidoActivo.senaTotal)}`}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={handleQuitarPedido}>
            Quitar
          </Button>
        </p>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <ScannerInput onSeleccionar={handleSeleccionar} disabled={!!productoPesoPendiente} />
        </div>
        {!pedidoActivo && renglones.length === 0 && (
          <CargarPedidoDialog onCargar={handleCargarPedido} />
        )}
      </div>

      <Carrito
        renglones={renglones}
        onCantidadChange={actualizarCantidad}
        onCantidadYPrecioChange={actualizarCantidadYPrecio}
        onQuitar={quitarRenglon}
      />

      {renglones.length > 0 && (
        <>
          <ResumenVenta resumen={resumen} />
          <Button type="button" onClick={() => setPaso("cobro")} className="w-fit">
            <ShoppingCart className="size-4" />
            Cobrar
          </Button>
        </>
      )}

      {productoPesoPendiente && (
        <PesoDialog
          producto={productoPesoPendiente}
          onConfirmar={confirmarPeso}
          onCancelar={() => setProductoPesoPendiente(null)}
        />
      )}
    </div>
  );
}
