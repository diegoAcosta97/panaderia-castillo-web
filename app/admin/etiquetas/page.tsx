import { PantallaEtiquetas } from "@/features/etiquetas/components/PantallaEtiquetas";

// Generar etiquetas no depende de un turno de caja abierto -- a diferencia de
// /pos/(operacion)/etiquetas, esta página no necesita ese gate.
export default function EtiquetasPage() {
  return <PantallaEtiquetas />;
}
