import { PantallaEtiquetas } from "@/features/etiquetas/components/PantallaEtiquetas";

// El layout de app/pos/(operacion) ya garantiza que haya un turno abierto para llegar acá
// (E4-2), mismo criterio que /pos/gastos.
export default function EtiquetasPage() {
  return <PantallaEtiquetas />;
}
