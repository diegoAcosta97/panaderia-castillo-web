import { Etiqueta } from "@/features/etiquetas/components/Etiqueta";

// E10-4: grilla lista para imprimir y recortar (RF-8.3). El código de barras impreso es el del
// producto (no uno por lote), ver nota en docs/data-model.md.
export function HojaEtiquetas({
  nombre,
  precio,
  codigoBarras,
  fechaVencimiento,
  cantidad,
}: {
  nombre: string;
  precio: number;
  codigoBarras: string;
  fechaVencimiento: string | null;
  cantidad: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 p-6 print:gap-1 print:p-2">
      {Array.from({ length: cantidad }, (_, i) => (
        <Etiqueta
          key={i}
          nombre={nombre}
          precio={precio}
          codigoBarras={codigoBarras}
          fechaVencimiento={fechaVencimiento}
        />
      ))}
    </div>
  );
}
