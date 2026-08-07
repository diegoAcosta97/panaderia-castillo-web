"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScannerInput } from "@/features/ventas/components/ScannerInput";
import { PesoDialog } from "@/features/ventas/components/PesoDialog";
import { Carrito } from "@/features/ventas/components/Carrito";
import { ResumenVenta } from "@/features/ventas/components/ResumenVenta";
import { PantallaCobro } from "@/features/ventas/components/PantallaCobro";
import { useCarrito } from "@/features/ventas/hooks/useCarrito";
import { useResumenVenta } from "@/features/ventas/hooks/useResumenVenta";
import type { Producto } from "@/repositories/productosRepository";
import type { OfertaConItems } from "@/repositories/ofertasRepository";
import type { DescuentoConCondiciones } from "@/repositories/descuentosRepository";

export function PantallaVenta({
  cajaTurnoId,
  ofertas,
  descuentos,
}: {
  cajaTurnoId: string;
  ofertas: OfertaConItems[];
  descuentos: DescuentoConCondiciones[];
}) {
  const { renglones, agregarProducto, actualizarCantidad, quitarRenglon, vaciar } = useCarrito();
  const [productoPesoPendiente, setProductoPesoPendiente] = useState<Producto | null>(null);
  const [paso, setPaso] = useState<"carrito" | "cobro">("carrito");
  const [ultimoComprobante, setUltimoComprobante] = useState<number | null>(null);
  const resumen = useResumenVenta(renglones, ofertas, descuentos);

  function handleSeleccionar(producto: Producto) {
    if (producto.tipo_venta === "peso") {
      setProductoPesoPendiente(producto);
    } else {
      agregarProducto(producto, 1);
    }
  }

  function confirmarPeso(peso: number) {
    if (productoPesoPendiente) {
      agregarProducto(productoPesoPendiente, peso);
      setProductoPesoPendiente(null);
    }
  }

  function handleConfirmada(numeroComprobante: number) {
    setUltimoComprobante(numeroComprobante);
    vaciar();
    setPaso("carrito");
  }

  if (paso === "cobro") {
    return (
      <PantallaCobro
        cajaTurnoId={cajaTurnoId}
        renglones={renglones}
        resumen={resumen}
        onCancelar={() => setPaso("carrito")}
        onConfirmada={handleConfirmada}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      {ultimoComprobante && (
        <p className="rounded-lg border border-green-600/30 bg-green-600/10 p-3 text-sm">
          Venta confirmada — comprobante N.º {ultimoComprobante}
        </p>
      )}

      <ScannerInput onSeleccionar={handleSeleccionar} disabled={!!productoPesoPendiente} />

      <Carrito
        renglones={renglones}
        onCantidadChange={actualizarCantidad}
        onQuitar={quitarRenglon}
      />

      {renglones.length > 0 && (
        <>
          <ResumenVenta resumen={resumen} />
          <Button type="button" onClick={() => setPaso("cobro")} className="w-fit">
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
