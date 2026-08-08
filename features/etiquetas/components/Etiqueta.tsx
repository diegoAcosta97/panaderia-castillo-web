"use client";

import { useEffect, useRef } from "react";
import { renderizarCodigoBarras } from "@/lib/barcode";

export function Etiqueta({
  nombre,
  precio,
  fechaVencimiento,
  codigoBarras,
}: {
  nombre: string;
  precio: number;
  fechaVencimiento: string | null;
  codigoBarras: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current) renderizarCodigoBarras(svgRef.current, codigoBarras);
  }, [codigoBarras]);

  return (
    <div className="flex flex-col items-center gap-1 break-inside-avoid border p-2 text-center">
      <p className="text-sm leading-tight font-medium">{nombre}</p>
      <p className="text-sm font-semibold">${precio}</p>
      {fechaVencimiento && (
        <p className="text-xs text-muted-foreground">Vence: {fechaVencimiento}</p>
      )}
      <svg ref={svgRef} />
    </div>
  );
}
